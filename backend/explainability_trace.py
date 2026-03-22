"""
MoScript
A MoStar Industries Programming Language
Seal: ◉⟁⬡

Engine:  mo-border-phantom-001
Module:  explainability_trace
Layer:   Decision / Alert Layer
Version: 1.0.0

"Every score the engine produces must be able to stand in a policy room
 and name every reason it exists."
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional
import json
from datetime import datetime, timezone


# ─────────────────────────────────────────────
# Evidence types
# ─────────────────────────────────────────────

class EvidenceType(Enum):
    HEALTH_SIGNAL         = "health_signal"
    MARKET_SIGNAL         = "market_signal"
    TRANSPORT_SIGNAL      = "transport_signal"
    LINGUISTIC_DRIFT      = "linguistic_drift"
    ENTROPY_SPIKE         = "entropy_spike"
    CENTRALITY_SCORE      = "centrality_score"
    GRAVITY_PULL          = "gravity_pull"
    DIFFUSION_TIMING      = "diffusion_timing"
    HMM_INFERENCE         = "hmm_inference"
    SEASONAL_WEIGHT       = "seasonal_weight"
    FRICTION_SURFACE      = "friction_surface"
    REMOTE_SENSING        = "remote_sensing"
    COMMUNITY_REPORT      = "community_report"


class RiskClass(Enum):
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


# ─────────────────────────────────────────────
# Evidence atoms
# ─────────────────────────────────────────────

@dataclass
class EvidenceAtom:
    """
    A single piece of evidence supporting a corridor score.
    Atomic, typed, traceable to its source.
    """
    evidence_type: EvidenceType
    description: str
    weight: float                       # contribution to overall score (0–1)
    source: str                         # data source / model that produced this
    confidence: float                   # confidence in this evidence (0–1)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    raw_value: Optional[Any] = None     # original numeric or text value
    node_ids: list[str] = field(default_factory=list)  # nodes involved


# ─────────────────────────────────────────────
# The corridor score
# ─────────────────────────────────────────────

@dataclass
class CorridorScore:
    """
    The fully explainable output of the Phantom POE Engine.
    Every number has a name. Every name has a source.
    """
    corridor_id: str
    start_node: str
    end_node: str

    # Final score (0–1)
    corridor_score: float = 0.0
    risk_class: RiskClass = RiskClass.LOW

    # Component scores from each soul
    gravity_score: float = 0.0          # Soul 1
    diffusion_score: float = 0.0        # Soul 2
    centrality_score: float = 0.0       # Soul 3
    hmm_score: float = 0.0             # Soul 4
    seasonal_score: float = 0.0         # Soul 5
    linguistic_score: float = 0.0       # Soul 6
    entropy_score: float = 0.0          # Soul 7
    friction_score: float = 0.0         # Terrain physics

    # Transport mode inference
    inferred_mode: str = "foot"
    inferred_velocity_kmh: float = 0.0

    # Evidence
    evidence: list[EvidenceAtom] = field(default_factory=list)

    # Human-readable trace
    trace_lines: list[str] = field(default_factory=list)

    # Flags
    phantom_poe_activated: bool = False
    seasonally_active: bool = True
    requires_canoe: bool = False
    conflict_detour: bool = False

    # Timestamps
    first_detected: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_updated: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─────────────────────────────────────────────
# Score synthesiser
# ─────────────────────────────────────────────

# Soul weights — how much each model contributes to the final score.
# These are tunable; start balanced then calibrate from ground-truth.
SOUL_WEIGHTS = {
    "gravity":    0.10,
    "diffusion":  0.20,
    "centrality": 0.15,
    "hmm":        0.20,
    "seasonal":   0.08,
    "linguistic": 0.10,
    "entropy":    0.12,
    "friction":   0.05,   # terrain is a constraint modifier, not a primary signal
}

# Risk thresholds
RISK_THRESHOLDS = {
    RiskClass.CRITICAL: 0.80,
    RiskClass.HIGH:     0.60,
    RiskClass.MEDIUM:   0.40,
    RiskClass.LOW:      0.0,
}


class ExplainabilityEngine:
    """
    mo-border-phantom-001 · Explainability Trace

    Takes component scores from all 7 Mathematical Souls + terrain physics
    and synthesises a single CorridorScore with a full, named evidence trail.

    Design principle: every number produced by this engine must be able to
    stand in a WHO policy room and name every reason it exists.
    """

    def __init__(self, soul_weights: dict[str, float] = None):
        self.weights = soul_weights or SOUL_WEIGHTS

    def synthesise(
        self,
        corridor_id: str,
        start_node: str,
        end_node: str,
        gravity_score: float = 0.0,
        diffusion_score: float = 0.0,
        centrality_score: float = 0.0,
        hmm_score: float = 0.0,
        seasonal_score: float = 0.0,
        linguistic_score: float = 0.0,
        entropy_score: float = 0.0,
        friction_score: float = 0.0,
        evidence: list[EvidenceAtom] = None,
        inferred_velocity_kmh: float = 0.0,
        seasonally_active: bool = True,
        requires_canoe: bool = False,
        conflict_detour: bool = False,
    ) -> CorridorScore:
        """
        Synthesise a full CorridorScore with explainability trace.

        The final score is a weighted sum of component scores,
        capped at 1.0 and floored at 0.0.
        """
        evidence = evidence or []

        # Weighted sum
        raw_score = (
            self.weights["gravity"]    * gravity_score    +
            self.weights["diffusion"]  * diffusion_score  +
            self.weights["centrality"] * centrality_score +
            self.weights["hmm"]        * hmm_score        +
            self.weights["seasonal"]   * seasonal_score   +
            self.weights["linguistic"] * linguistic_score +
            self.weights["entropy"]    * entropy_score    +
            self.weights["friction"]   * friction_score
        )
        corridor_score = round(max(0.0, min(1.0, raw_score)), 4)

        # Risk classification
        risk_class = RiskClass.LOW
        for rc, threshold in RISK_THRESHOLDS.items():
            if corridor_score >= threshold:
                risk_class = rc
                break

        # Infer transport mode from velocity
        inferred_mode = _infer_mode(inferred_velocity_kmh)

        # Build trace
        trace = self._build_trace(
            corridor_id=corridor_id,
            start_node=start_node,
            end_node=end_node,
            corridor_score=corridor_score,
            risk_class=risk_class,
            component_scores={
                "gravity":    gravity_score,
                "diffusion":  diffusion_score,
                "centrality": centrality_score,
                "hmm":        hmm_score,
                "seasonal":   seasonal_score,
                "linguistic": linguistic_score,
                "entropy":    entropy_score,
                "friction":   friction_score,
            },
            evidence=evidence,
            inferred_mode=inferred_mode,
            inferred_velocity_kmh=inferred_velocity_kmh,
            seasonally_active=seasonally_active,
            requires_canoe=requires_canoe,
            conflict_detour=conflict_detour,
        )

        return CorridorScore(
            corridor_id=corridor_id,
            start_node=start_node,
            end_node=end_node,
            corridor_score=corridor_score,
            risk_class=risk_class,
            gravity_score=gravity_score,
            diffusion_score=diffusion_score,
            centrality_score=centrality_score,
            hmm_score=hmm_score,
            seasonal_score=seasonal_score,
            linguistic_score=linguistic_score,
            entropy_score=entropy_score,
            friction_score=friction_score,
            inferred_mode=inferred_mode,
            inferred_velocity_kmh=inferred_velocity_kmh,
            evidence=evidence,
            trace_lines=trace,
            phantom_poe_activated=(corridor_score >= RISK_THRESHOLDS[RiskClass.HIGH]),
            seasonally_active=seasonally_active,
            requires_canoe=requires_canoe,
            conflict_detour=conflict_detour,
        )

    def _build_trace(
        self,
        corridor_id: str,
        start_node: str,
        end_node: str,
        corridor_score: float,
        risk_class: RiskClass,
        component_scores: dict[str, float],
        evidence: list[EvidenceAtom],
        inferred_mode: str,
        inferred_velocity_kmh: float,
        seasonally_active: bool,
        requires_canoe: bool,
        conflict_detour: bool,
    ) -> list[str]:
        """
        Build the full human-readable explainability trace.

        Format mirrors what a WHO analyst would expect:
        clear, numbered, traceable to sources.
        """
        lines = []

        # ── Header ──────────────────────────────────────────────────────
        lines.append("PHANTOM POE ENGINE · CORRIDOR SCORE TRACE")
        lines.append(f"Corridor:  {corridor_id}")
        lines.append(f"Route:     {start_node} → {end_node}")
        lines.append(f"Score:     {corridor_score:.4f}  [{risk_class.value}]")
        lines.append(f"Activated: {'YES ◉' if corridor_score >= 0.60 else 'NO'}")
        lines.append("─" * 52)

        # ── Component breakdown ──────────────────────────────────────────
        lines.append("COMPONENT SCORES (7 Mathematical Souls + Terrain):")
        lines.append("")

        soul_labels = {
            "gravity":    ("🜁 Soul 1", "Gravity Model",         "Population × market pull between nodes"),
            "diffusion":  ("🜂 Soul 2", "Spatial Diffusion",     "Sequential outbreak timing → path reconstruction"),
            "centrality": ("🜃 Soul 3", "Graph Centrality",      "Betweenness centrality — high score, no official POE"),
            "hmm":        ("🜄 Soul 4", "Hidden Markov Model",   "Crossing inferred from signals on both sides of border"),
            "seasonal":   ("☿  Soul 5", "Fourier Seasonality",   "52-week harmonic — corridor active in current phase"),
            "linguistic": ("♄  Soul 6", "Linguistic Drift",      "Terminology shift rate implies cultural corridor"),
            "entropy":    ("♃  Soul 7", "Entropy Spike",         "ΔH > threshold — unexpected signal cluster detected"),
            "friction":   ("⛰  Terrain", "Friction Surface",     "Least-cost path over slope, hydro, land cover, flood"),
        }

        for key, (symbol, name, desc) in soul_labels.items():
            score = component_scores.get(key, 0.0)
            weight = self.weights.get(key, 0.0)
            contribution = score * weight
            bar = _score_bar(score)
            lines.append(f"  {symbol} — {name}")
            lines.append(f"    Score:        {score:.3f}  {bar}")
            lines.append(f"    Weight:       {weight:.2f}  →  contribution: {contribution:.4f}")
            lines.append(f"    Basis:        {desc}")
            lines.append("")

        lines.append("─" * 52)

        # ── Weighted total ───────────────────────────────────────────────
        lines.append(f"WEIGHTED TOTAL:  {corridor_score:.4f}")
        lines.append(f"RISK CLASS:      {risk_class.value}")
        lines.append("")

        # ── Evidence atoms ───────────────────────────────────────────────
        if evidence:
            lines.append("EVIDENCE TRAIL:")
            lines.append("")
            for i, atom in enumerate(evidence, 1):
                lines.append(f"  [{i}] {atom.evidence_type.value.upper()}")
                lines.append(f"      {atom.description}")
                lines.append(f"      Source:     {atom.source}")
                lines.append(f"      Confidence: {atom.confidence:.2f}  |  Weight: {atom.weight:.2f}")
                if atom.node_ids:
                    lines.append(f"      Nodes:      {', '.join(atom.node_ids)}")
                if atom.raw_value is not None:
                    lines.append(f"      Raw value:  {atom.raw_value}")
                lines.append("")
            lines.append("─" * 52)

        # ── Contextual flags ─────────────────────────────────────────────
        lines.append("CONTEXTUAL FLAGS:")
        lines.append(f"  Transport mode:    {inferred_mode} ({inferred_velocity_kmh:.1f} km/h inferred)")
        lines.append(f"  Seasonally active: {'YES' if seasonally_active else 'NO — route dormant this season'}")
        lines.append(f"  River crossing:    {'YES — canoe/boat required' if requires_canoe else 'no boat required'}")
        lines.append(f"  Conflict detour:   {'YES — path likely a conflict-avoidance route' if conflict_detour else 'no conflict signal'}")
        lines.append("")

        # ── System assertion ─────────────────────────────────────────────
        lines.append("SYSTEM ASSERTION:")
        lines.append("  This corridor score reflects aggregate signal patterns.")
        lines.append("  No individual identity, biometric, or device-level")
        lines.append("  data was used. Corridor-level inference only.")
        lines.append("")
        lines.append("  MoStar Industries · mo-border-phantom-001 · ◉⟁⬡")

        return lines

    def render(self, score: CorridorScore) -> str:
        """Return the trace as a single printable string."""
        return "\n".join(score.trace_lines)

    def to_json(self, score: CorridorScore) -> str:
        """Serialise the full CorridorScore to JSON for API responses."""
        return json.dumps({
            "corridor_id": score.corridor_id,
            "start_node": score.start_node,
            "end_node": score.end_node,
            "corridor_score": score.corridor_score,
            "risk_class": score.risk_class.value,
            "phantom_poe_activated": score.phantom_poe_activated,
            "component_scores": {
                "gravity":    score.gravity_score,
                "diffusion":  score.diffusion_score,
                "centrality": score.centrality_score,
                "hmm":        score.hmm_score,
                "seasonal":   score.seasonal_score,
                "linguistic": score.linguistic_score,
                "entropy":    score.entropy_score,
                "friction":   score.friction_score,
            },
            "inferred_mode": score.inferred_mode,
            "inferred_velocity_kmh": score.inferred_velocity_kmh,
            "seasonally_active": score.seasonally_active,
            "requires_canoe": score.requires_canoe,
            "conflict_detour": score.conflict_detour,
            "evidence": [
                {
                    "type": e.evidence_type.value,
                    "description": e.description,
                    "weight": e.weight,
                    "source": e.source,
                    "confidence": e.confidence,
                    "timestamp": e.timestamp,
                    "node_ids": e.node_ids,
                }
                for e in score.evidence
            ],
            "trace": score.trace_lines,
            "first_detected": score.first_detected,
            "last_updated": score.last_updated,
            "engine": "mo-border-phantom-001",
            "seal": "◉⟁⬡",
        }, indent=2)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _infer_mode(velocity_kmh: float) -> str:
    if velocity_kmh <= 0:
        return "unknown"
    if velocity_kmh <= 7:
        return "foot"
    if velocity_kmh <= 25:
        return "motorcycle"
    if velocity_kmh <= 5 and velocity_kmh > 0:
        return "canoe"
    return "vehicle"


def _score_bar(score: float, width: int = 20) -> str:
    filled = int(score * width)
    return "[" + "█" * filled + "░" * (width - filled) + "]"


# ─────────────────────────────────────────────
# MoScript identity
# ─────────────────────────────────────────────

MOSCRIPT = {
    "id": "mo-border-phantom-001",
    "name": "Phantom POE Engine — Explainability Trace",
    "trigger": "corridor_score_synthesised OR phantom_poe_activated",
    "inputs": [
        "gravity_score", "diffusion_score", "centrality_score",
        "hmm_score", "seasonal_score", "linguistic_score",
        "entropy_score", "friction_score", "evidence_atoms",
    ],
    "logic": "ExplainabilityEngine.synthesise() → CorridorScore + trace_lines",
    "voiceLine": "Every number I produce can speak for itself.",
    "sass": "You want a black box? Wrong engine. This one names its reasons.",
}


# ─────────────────────────────────────────────
# Demo
# ─────────────────────────────────────────────

if __name__ == "__main__":

    engine = ExplainabilityEngine()

    # Simulate evidence from a real detection event
    evidence = [
        EvidenceAtom(
            evidence_type=EvidenceType.HEALTH_SIGNAL,
            description="3 sequential cholera cases: Village A (Day 1) → Market B (Day 3) → Village C (Day 6)",
            weight=0.35,
            source="EWARS/DHIS2 syndromic feed",
            confidence=0.91,
            raw_value={"day1": "Village_A", "day3": "Market_B", "day6": "Village_C"},
            node_ids=["village_a", "market_b", "village_c"],
        ),
        EvidenceAtom(
            evidence_type=EvidenceType.DIFFUSION_TIMING,
            description="Travel velocity 18 km/day inferred — consistent with motorcycle transport",
            weight=0.20,
            source="Phantom POE Engine · Soul 2 · Spatial Diffusion",
            confidence=0.84,
            raw_value={"velocity_kmh": 18.0, "mode_inferred": "motorcycle"},
            node_ids=["village_a", "village_c"],
        ),
        EvidenceAtom(
            evidence_type=EvidenceType.CENTRALITY_SCORE,
            description="Forest junction node has betweenness centrality 0.74 — no official POE designation",
            weight=0.15,
            source="Phantom POE Engine · Soul 3 · Graph Centrality (Neo4j GDS)",
            confidence=0.88,
            raw_value={"betweenness": 0.74, "official_poe": False},
            node_ids=["forest_junction_47"],
        ),
        EvidenceAtom(
            evidence_type=EvidenceType.LINGUISTIC_DRIFT,
            description="Disease terminology shifts from 'zazzabi' to 'homa' across 3 nodes — linguistic boundary crossed",
            weight=0.12,
            source="Phantom POE Engine · Soul 6 · Linguistic Drift (multilingual NLP)",
            confidence=0.76,
            raw_value={"term_a": "zazzabi", "term_b": "homa", "levenshtein_distance": 6},
            node_ids=["village_a", "village_c"],
        ),
        EvidenceAtom(
            evidence_type=EvidenceType.ENTROPY_SPIKE,
            description="Shannon entropy spike ΔH = 1.42 detected at forest junction — above threshold 0.8",
            weight=0.18,
            source="Phantom POE Engine · Soul 7 · Entropy Spike Detector",
            confidence=0.93,
            raw_value={"delta_H": 1.42, "threshold": 0.8},
            node_ids=["forest_junction_47"],
        ),
    ]

    score = engine.synthesise(
        corridor_id="CORRIDOR-KE-TZ-047",
        start_node="Village_Lwanda_KE",
        end_node="Village_Bunda_TZ",
        gravity_score=0.72,
        diffusion_score=0.88,
        centrality_score=0.81,
        hmm_score=0.79,
        seasonal_score=0.65,
        linguistic_score=0.70,
        entropy_score=0.91,
        friction_score=0.60,
        evidence=evidence,
        inferred_velocity_kmh=18.0,
        seasonally_active=True,
        requires_canoe=False,
        conflict_detour=False,
    )

    print(engine.render(score))
    print("\n")
    print("JSON output (first 40 lines):")
    json_out = engine.to_json(score)
    for line in json_out.split("\n")[:40]:
        print(line)
    print("  ...")
