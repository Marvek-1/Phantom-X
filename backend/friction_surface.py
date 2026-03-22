"""
MoScript
A MoStar Industries Programming Language
Seal: ◉⟁⬡

Engine:  mo-border-phantom-001
Module:  friction_surface
Layer:   Spatial Intelligence — Terrain Physics
Version: 1.0.0

"The path is not drawn on a map. It is carved by gravity, water, and need."
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────

EARTH_RADIUS_KM = 6371.0

# Tobler's Hiking Function base speed (km/h on flat terrain)
TOBLER_BASE_KMH = 6.0

# Sentinel-1 SAR flood probability threshold
FLOOD_PROBABILITY_THRESHOLD = 0.65

# Maximum passable river width (metres) without boat infrastructure
MAX_WADEABLE_RIVER_WIDTH_M = 40.0

# Slope angle (degrees) at which movement becomes near-impossible on foot
MAX_PASSABLE_SLOPE_DEG = 35.0


# ─────────────────────────────────────────────
# Enumerations
# ─────────────────────────────────────────────

class LandCover(Enum):
    OPEN_GROUND    = "open_ground"
    SPARSE_VEG     = "sparse_vegetation"
    DENSE_FOREST   = "dense_forest"
    CROPLAND       = "cropland"
    WETLAND        = "wetland"
    URBAN          = "urban"
    WATER_BODY     = "water_body"
    ROCK_BARE      = "bare_rock"
    SAND_DUNE      = "sand_dune"


class TransportMode(Enum):
    FOOT           = "foot"
    MOTORCYCLE     = "motorcycle"
    VEHICLE        = "vehicle"
    CANOE          = "canoe"
    LIVESTOCK      = "livestock"


class SeasonalPhase(Enum):
    DRY            = "dry"
    WET_ONSET      = "wet_onset"
    PEAK_WET       = "peak_wet"
    RECESSION      = "recession"


# ─────────────────────────────────────────────
# Data structures
# ─────────────────────────────────────────────

@dataclass
class TerrainCell:
    """
    A single raster cell in the friction surface.
    Resolution: typically 30m–100m depending on DEM source.
    """
    lat: float
    lng: float

    # From DEM (Copernicus/SRTM/ALOS)
    elevation_m: float = 0.0
    slope_deg: float = 0.0
    aspect_deg: float = 0.0          # 0=N, 90=E, 180=S, 270=W

    # From ESA/Copernicus land cover
    land_cover: LandCover = LandCover.OPEN_GROUND

    # From HydroSHEDS / HydroRIVERS
    river_present: bool = False
    river_width_m: float = 0.0
    bridge_present: bool = False
    ford_present: bool = False

    # From Sentinel-1 SAR (flood extent)
    flood_probability: float = 0.0   # 0–1
    flooded: bool = False            # derived

    # From CHIRPS rainfall
    rainfall_7d_mm: float = 0.0

    # From OSM / HOT
    road_present: bool = False
    road_quality: int = 0            # 0=none, 1=track, 2=unpaved, 3=paved
    footpath_present: bool = False

    # Context
    conflict_risk: float = 0.0       # 0–1 from ACLED/advisory layers
    protected_area: bool = False

    # Derived
    friction_cost: float = field(default=0.0, init=False)
    passable: bool = field(default=True, init=False)


@dataclass
class FrictionSurface:
    """
    The complete friction surface over a geographic bounding box.
    Drives least-cost path computation for corridor inference.
    """
    cells: list[TerrainCell]
    resolution_m: float = 100.0
    season: SeasonalPhase = SeasonalPhase.DRY
    transport_mode: TransportMode = TransportMode.FOOT

    # Computed corridors
    least_cost_paths: list[dict] = field(default_factory=list)
    phantom_corridor_candidates: list[dict] = field(default_factory=list)


@dataclass
class CorridorSegment:
    """
    A reconstructed movement corridor segment.
    Output unit of the friction engine.
    """
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    total_cost: float                # accumulated friction cost
    distance_km: float
    estimated_travel_hrs: float
    dominant_mode: TransportMode
    crossing_points: list[dict]      # river fords, border zone intersections
    seasonally_blocked: bool
    flood_risk: float
    corridor_confidence: float       # 0–1
    evidence_trail: list[str]        # explainability


# ─────────────────────────────────────────────
# Core friction calculator
# ─────────────────────────────────────────────

class FrictionEngine:
    """
    mo-border-phantom-001 · Friction Surface Layer

    Computes terrain-aware movement cost for each cell and derives
    least-cost corridors — the physical substrate of hidden POE detection.

    "People do not move in straight lines.
     They move through terrain constraints."
    """

    def __init__(
        self,
        mode: TransportMode = TransportMode.FOOT,
        season: SeasonalPhase = SeasonalPhase.DRY,
    ):
        self.mode = mode
        self.season = season

    # ── Land cover cost multipliers ──────────────────────────────────────

    LAND_COVER_COST: dict[LandCover, dict[TransportMode, float]] = {
        LandCover.OPEN_GROUND:  {TransportMode.FOOT: 1.0, TransportMode.MOTORCYCLE: 1.0, TransportMode.VEHICLE: 1.2, TransportMode.LIVESTOCK: 1.0},
        LandCover.SPARSE_VEG:   {TransportMode.FOOT: 1.3, TransportMode.MOTORCYCLE: 1.5, TransportMode.VEHICLE: 2.0, TransportMode.LIVESTOCK: 1.2},
        LandCover.DENSE_FOREST: {TransportMode.FOOT: 2.5, TransportMode.MOTORCYCLE: 4.0, TransportMode.VEHICLE: 9.0, TransportMode.LIVESTOCK: 3.0},
        LandCover.CROPLAND:     {TransportMode.FOOT: 1.2, TransportMode.MOTORCYCLE: 1.8, TransportMode.VEHICLE: 2.5, TransportMode.LIVESTOCK: 1.5},
        LandCover.WETLAND:      {TransportMode.FOOT: 3.5, TransportMode.MOTORCYCLE: 6.0, TransportMode.VEHICLE: 99.0, TransportMode.LIVESTOCK: 4.0},
        LandCover.URBAN:        {TransportMode.FOOT: 1.1, TransportMode.MOTORCYCLE: 1.1, TransportMode.VEHICLE: 1.0, TransportMode.LIVESTOCK: 2.0},
        LandCover.WATER_BODY:   {TransportMode.FOOT: 99.0, TransportMode.MOTORCYCLE: 99.0, TransportMode.VEHICLE: 99.0, TransportMode.CANOE: 1.0},
        LandCover.ROCK_BARE:    {TransportMode.FOOT: 3.0, TransportMode.MOTORCYCLE: 5.0, TransportMode.VEHICLE: 99.0, TransportMode.LIVESTOCK: 4.0},
        LandCover.SAND_DUNE:    {TransportMode.FOOT: 2.5, TransportMode.MOTORCYCLE: 4.5, TransportMode.VEHICLE: 99.0, TransportMode.LIVESTOCK: 3.5},
    }

    def tobler_speed(self, slope_deg: float) -> float:
        """
        Tobler's Hiking Function.
        Returns walking speed (km/h) as a function of slope angle.

        W = 6 × exp(−3.5 × |tan(slope) + 0.05|)

        Downhill slightly faster than flat; steep slopes become very slow.
        """
        slope_rad = math.radians(slope_deg)
        tan_slope = math.tan(slope_rad)
        speed = TOBLER_BASE_KMH * math.exp(-3.5 * abs(tan_slope + 0.05))
        return max(speed, 0.1)  # minimum 0.1 km/h — no terrain is truly impassable on foot

    def slope_cost_multiplier(self, slope_deg: float) -> float:
        """
        Convert Tobler speed to a cost multiplier relative to flat terrain.
        Higher slope → higher cost.
        """
        flat_speed = self.tobler_speed(0.0)
        actual_speed = self.tobler_speed(slope_deg)
        return flat_speed / actual_speed

    def river_crossing_cost(self, cell: TerrainCell) -> float:
        """
        Cost of crossing a river at this cell.

        Logic:
        - Bridge present → minimal cost
        - Known ford → moderate cost
        - Narrow river (< 40m) → wading cost
        - Wide river → near-impassable for foot/moto; canoe required
        - Flooded → exponentially worse
        """
        if not cell.river_present:
            return 1.0

        if cell.bridge_present:
            return 1.1  # bridge adds trivial cost

        base = 1.0

        if cell.ford_present:
            base = 2.5
        elif cell.river_width_m <= MAX_WADEABLE_RIVER_WIDTH_M:
            base = 4.0
        else:
            # Wide river — mode-dependent
            if self.mode == TransportMode.CANOE:
                base = 1.5
            elif self.mode in (TransportMode.FOOT, TransportMode.MOTORCYCLE):
                base = 15.0
            else:
                base = 99.0

        # Flood amplification
        if cell.flooded or cell.flood_probability >= FLOOD_PROBABILITY_THRESHOLD:
            flood_amp = 1.0 + (cell.flood_probability * 4.0)
            base *= flood_amp

        # Seasonal: wet season raises river crossing cost
        if self.season in (SeasonalPhase.PEAK_WET, SeasonalPhase.WET_ONSET):
            base *= 1.8

        return base

    def road_discount(self, cell: TerrainCell) -> float:
        """
        Roads reduce friction. Better road quality → lower multiplier.
        Footpaths help foot/livestock but not vehicles.
        """
        if cell.road_quality == 3:      # paved
            return 0.5
        if cell.road_quality == 2:      # unpaved
            return 0.7
        if cell.road_quality == 1:      # track
            return 0.85
        if cell.footpath_present and self.mode in (TransportMode.FOOT, TransportMode.LIVESTOCK):
            return 0.9
        return 1.0

    def seasonal_modifier(self, cell: TerrainCell) -> float:
        """
        Seasonal conditions alter the friction landscape.

        Dry season:  wetlands passable, rivers low, some paths open
        Wet onset:   wetlands begin flooding, rivers rise
        Peak wet:    many paths impassable, rerouting occurs
        Recession:   partial recovery, mud still present
        """
        if self.season == SeasonalPhase.DRY:
            if cell.land_cover == LandCover.WETLAND:
                return 0.7  # wetlands partially passable in dry season
            return 1.0

        if self.season == SeasonalPhase.PEAK_WET:
            if cell.land_cover == LandCover.WETLAND:
                return 2.5
            if cell.land_cover == LandCover.CROPLAND:
                return 1.6  # muddy
            if cell.rainfall_7d_mm > 80:
                return 1.4  # general mud penalty
            return 1.0

        if self.season == SeasonalPhase.WET_ONSET:
            return 1.2

        if self.season == SeasonalPhase.RECESSION:
            return 1.1

        return 1.0

    def conflict_modifier(self, cell: TerrainCell) -> float:
        """
        Conflict risk forces detours — routes shift to avoid known risk zones.
        High conflict → people seek hidden paths (which is EXACTLY what Phantom POE maps).
        """
        if cell.conflict_risk > 0.8:
            return 99.0     # near-impassable through active conflict
        if cell.conflict_risk > 0.5:
            return 4.0      # significant avoidance behavior
        if cell.conflict_risk > 0.2:
            return 1.8
        return 1.0

    def compute_cell_friction(self, cell: TerrainCell) -> float:
        """
        Master friction computation for a single terrain cell.

        friction = base_land_cover_cost
                 × slope_cost
                 × river_crossing_cost
                 × road_discount
                 × seasonal_modifier
                 × conflict_modifier

        Returns cost in units of [time × difficulty] per unit distance.
        """
        if cell.slope_deg >= MAX_PASSABLE_SLOPE_DEG and self.mode != TransportMode.FOOT:
            cell.passable = False
            return 99.0

        # 1. Land cover base
        lc_costs = self.LAND_COVER_COST.get(cell.land_cover, {})
        base = lc_costs.get(self.mode, lc_costs.get(TransportMode.FOOT, 1.0))

        # 2. Slope physics (Tobler)
        slope_mult = self.slope_cost_multiplier(cell.slope_deg)

        # 3. River crossing
        river_mult = self.river_crossing_cost(cell)

        # 4. Road discount
        road_disc = self.road_discount(cell)

        # 5. Seasonal
        seasonal_mult = self.seasonal_modifier(cell)

        # 6. Conflict avoidance
        conflict_mult = self.conflict_modifier(cell)

        # 7. Protected area (legal barrier — acts like high friction for formal movement;
        #    informal movement may use protected areas, so we use moderate multiplier)
        protected_mult = 1.5 if cell.protected_area else 1.0

        friction = (base
                    * slope_mult
                    * river_mult
                    * road_disc
                    * seasonal_mult
                    * conflict_mult
                    * protected_mult)

        cell.friction_cost = friction
        return friction

    def compute_surface(self, surface: FrictionSurface) -> FrictionSurface:
        """Compute friction for all cells in the surface."""
        for cell in surface.cells:
            self.compute_cell_friction(cell)
        return surface

    # ── Least-cost path ──────────────────────────────────────────────────

    def least_cost_path(
        self,
        surface: FrictionSurface,
        origin_idx: int,
        destination_idx: int,
    ) -> Optional[CorridorSegment]:
        """
        Dijkstra's algorithm over the friction surface.

        Returns the least-cost path as a CorridorSegment with
        full explainability trace — every cost driver named.

        In production this runs on the full raster via
        rasterio + scipy.ndimage.distance_transform_edt
        or skimage.graph.MCP_Geometric.
        This implementation shows the decision logic clearly.
        """
        import heapq

        n = len(surface.cells)
        if origin_idx >= n or destination_idx >= n:
            return None

        dist = [math.inf] * n
        prev = [-1] * n
        dist[origin_idx] = 0.0

        pq = [(0.0, origin_idx)]
        visited = set()

        # Approximate grid width from cell count + resolution
        grid_side = int(math.sqrt(n))

        def neighbours(idx: int):
            row, col = divmod(idx, grid_side)
            candidates = []
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = row + dr, col + dc
                    if 0 <= nr < grid_side and 0 <= nc < grid_side:
                        nidx = nr * grid_side + nc
                        # diagonal moves cost √2 more
                        step_dist = math.sqrt(dr**2 + dc**2)
                        candidates.append((nidx, step_dist))
            return candidates

        while pq:
            cost, u = heapq.heappop(pq)
            if u in visited:
                continue
            visited.add(u)
            if u == destination_idx:
                break

            for v, step_dist in neighbours(u):
                if v in visited:
                    continue
                cell_friction = surface.cells[v].friction_cost
                edge_cost = cost + cell_friction * step_dist * surface.resolution_m / 1000.0
                if edge_cost < dist[v]:
                    dist[v] = edge_cost
                    prev[v] = u
                    heapq.heappush(pq, (edge_cost, v))

        if dist[destination_idx] == math.inf:
            return None  # no passable path found

        # Reconstruct path
        path_indices = []
        cur = destination_idx
        while cur != -1:
            path_indices.append(cur)
            cur = prev[cur]
        path_indices.reverse()

        path_cells = [surface.cells[i] for i in path_indices]

        # Derive crossing points (river fords, border zone crossings)
        crossings = []
        for c in path_cells:
            if c.river_present and not c.bridge_present:
                crossings.append({
                    "lat": c.lat,
                    "lng": c.lng,
                    "type": "ford" if c.ford_present else "river_wade",
                    "width_m": c.river_width_m,
                    "flood_risk": c.flood_probability,
                })

        # Haversine distance
        o = surface.cells[origin_idx]
        d = surface.cells[destination_idx]
        distance_km = _haversine(o.lat, o.lng, d.lat, d.lng)

        # Estimated travel time via mean Tobler speed on path
        mean_slope = sum(c.slope_deg for c in path_cells) / max(len(path_cells), 1)
        tobler_speed = self.tobler_speed(mean_slope)
        travel_hrs = distance_km / tobler_speed if tobler_speed > 0 else 999.0

        # Flood risk across path
        flood_risk = max((c.flood_probability for c in path_cells), default=0.0)

        # Seasonally blocked?
        seasonally_blocked = any(
            c.friction_cost >= 50.0 for c in path_cells
        )

        # Corridor confidence: inverse of mean friction vs baseline
        mean_friction = sum(c.friction_cost for c in path_cells) / max(len(path_cells), 1)
        confidence = max(0.0, min(1.0, 1.0 - (mean_friction - 1.0) / 10.0))

        # Explainability trace
        evidence = _build_evidence_trail(path_cells, surface.season, self.mode, crossings)

        return CorridorSegment(
            start_lat=o.lat,
            start_lng=o.lng,
            end_lat=d.lat,
            end_lng=d.lng,
            total_cost=dist[destination_idx],
            distance_km=distance_km,
            estimated_travel_hrs=round(travel_hrs, 2),
            dominant_mode=self.mode,
            crossing_points=crossings,
            seasonally_blocked=seasonally_blocked,
            flood_risk=round(flood_risk, 3),
            corridor_confidence=round(confidence, 3),
            evidence_trail=evidence,
        )


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Returns great-circle distance in km."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def _build_evidence_trail(
    path_cells: list[TerrainCell],
    season: SeasonalPhase,
    mode: TransportMode,
    crossings: list[dict],
) -> list[str]:
    """
    Build human-readable explainability trace for a corridor segment.
    Every cost driver is named. No black boxes.
    """
    trail = []

    # Dominant land cover
    lc_counts: dict[str, int] = {}
    for c in path_cells:
        k = c.land_cover.value
        lc_counts[k] = lc_counts.get(k, 0) + 1
    dominant_lc = max(lc_counts, key=lc_counts.get)
    trail.append(f"Dominant terrain: {dominant_lc} ({lc_counts[dominant_lc]}/{len(path_cells)} cells)")

    # Slope
    slopes = [c.slope_deg for c in path_cells]
    mean_slope = sum(slopes) / len(slopes)
    trail.append(f"Mean slope: {mean_slope:.1f}° — Tobler travel penalty applied")

    # River crossings
    if crossings:
        trail.append(f"{len(crossings)} river crossing(s) detected — {', '.join(c['type'] for c in crossings)}")

    # Flood risk
    flood_cells = [c for c in path_cells if c.flood_probability >= FLOOD_PROBABILITY_THRESHOLD]
    if flood_cells:
        trail.append(f"Flood risk: {len(flood_cells)} cells above SAR threshold ({FLOOD_PROBABILITY_THRESHOLD})")

    # Seasonal
    trail.append(f"Season: {season.value} — seasonal multipliers applied to wetlands and river crossings")

    # Roads / paths
    road_cells = sum(1 for c in path_cells if c.road_present)
    path_cells_count = sum(1 for c in path_cells if c.footpath_present)
    if road_cells:
        trail.append(f"Road infrastructure: {road_cells} cells with road presence — friction discounted")
    if path_cells_count and mode == TransportMode.FOOT:
        trail.append(f"Footpath detected: {path_cells_count} cells — foot/livestock friction discounted")

    # Conflict
    conflict_cells = [c for c in path_cells if c.conflict_risk > 0.2]
    if conflict_cells:
        trail.append(f"Conflict avoidance: {len(conflict_cells)} cells with elevated risk — route may represent hidden detour")

    # Mode
    trail.append(f"Transport mode modelled: {mode.value}")

    return trail


# ─────────────────────────────────────────────
# MoScript identity
# ─────────────────────────────────────────────

MOSCRIPT = {
    "id": "mo-border-phantom-001",
    "name": "Phantom POE Engine — Friction Surface Layer",
    "trigger": "graph_edge_initialization OR corridor_reconstruction OR season_change",
    "inputs": [
        "dem_raster",
        "land_cover_raster",
        "hydro_rivers",
        "sentinel1_flood_extent",
        "chirps_rainfall",
        "osm_roads",
        "conflict_advisory",
    ],
    "logic": "FrictionEngine.compute_surface() → least_cost_path()",
    "voiceLine": "The border is not where they drew it. It is where the terrain allows.",
    "sass": "Your straight-line distance is a lie. My friction surface tells the truth.",
}


# ─────────────────────────────────────────────
# Quick demo
# ─────────────────────────────────────────────

if __name__ == "__main__":

    print("◉⟁⬡  Phantom POE Engine — Friction Surface Layer")
    print("=" * 56)

    # Simulate a small 3×3 grid across a border zone
    demo_cells = []
    for row in range(3):
        for col in range(3):
            c = TerrainCell(
                lat=-1.0 + row * 0.01,
                lng=34.0 + col * 0.01,
                elevation_m=1200 + row * 30 + col * 20,
                slope_deg=[2, 5, 18, 8, 12, 4, 25, 10, 6][row * 3 + col],
                land_cover=[
                    LandCover.OPEN_GROUND,
                    LandCover.SPARSE_VEG,
                    LandCover.DENSE_FOREST,
                    LandCover.CROPLAND,
                    LandCover.OPEN_GROUND,
                    LandCover.WETLAND,
                    LandCover.SPARSE_VEG,
                    LandCover.OPEN_GROUND,
                    LandCover.CROPLAND,
                ][row * 3 + col],
                river_present=(row == 1 and col == 1),
                river_width_m=25.0 if (row == 1 and col == 1) else 0.0,
                ford_present=(row == 1 and col == 1),
                flood_probability=0.3 if (row == 1 and col == 1) else 0.0,
                road_present=(col == 2),
                road_quality=1 if (col == 2) else 0,
            )
            demo_cells.append(c)

    surface = FrictionSurface(
        cells=demo_cells,
        resolution_m=100.0,
        season=SeasonalPhase.DRY,
        transport_mode=TransportMode.FOOT,
    )

    engine = FrictionEngine(mode=TransportMode.FOOT, season=SeasonalPhase.DRY)
    engine.compute_surface(surface)

    print("\nCell friction costs (3×3 grid):")
    for i, cell in enumerate(surface.cells):
        row, col = divmod(i, 3)
        print(f"  [{row},{col}] {cell.land_cover.value:<18} slope={cell.slope_deg}°  friction={cell.friction_cost:.2f}")

    corridor = engine.least_cost_path(surface, origin_idx=0, destination_idx=8)

    if corridor:
        print(f"\nLeast-cost corridor found:")
        print(f"  Distance:       {corridor.distance_km:.2f} km")
        print(f"  Est. travel:    {corridor.estimated_travel_hrs:.2f} hrs")
        print(f"  Total cost:     {corridor.total_cost:.2f}")
        print(f"  Confidence:     {corridor.corridor_confidence:.3f}")
        print(f"  Flood risk:     {corridor.flood_risk:.3f}")
        print(f"  River crossings:{len(corridor.crossing_points)}")
        print(f"\nExplainability trail:")
        for line in corridor.evidence_trail:
            print(f"  · {line}")
    else:
        print("\nNo passable corridor found.")

    print(f"\nvoiceLine: \"{MOSCRIPT['voiceLine']}\"")
