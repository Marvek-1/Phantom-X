"""
Phantom POE Engine - Python Backend API Server
Engine: mo-border-phantom-001
Layer: Backend Services — Friction Surface & Explainability

FastAPI server exposing Python backend modules to frontend
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from friction_surface import (
    FrictionEngine,
    TerrainCell,
    LandCover,
    TransportMode,
    SeasonalPhase,
)
from explainability_trace import (
    ExplainabilityEngine,
    EvidenceAtom,
    EvidenceType,
    CorridorScore,
)

app = FastAPI(
    title="Phantom POE Engine API",
    description="Corridor intelligence backend — Friction surface & Explainability",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Request/Response Models
# ─────────────────────────────────────────────

class TerrainCellRequest(BaseModel):
    lat: float
    lng: float
    elevation_m: float = 0.0
    slope_deg: float = 0.0
    land_cover: str = "open_ground"
    river_present: bool = False
    river_width_m: float = 0.0
    flood_probability: float = 0.0
    rainfall_7d_mm: float = 0.0
    road_quality: int = 0
    conflict_risk: float = 0.0

class FrictionRequest(BaseModel):
    cells: List[TerrainCellRequest]
    mode: str = "foot"
    season: str = "dry"

class CorridorAnalysisRequest(BaseModel):
    corridor_id: str
    from_node: str
    to_node: str
    distance_km: float
    evidence: List[Dict[str, Any]]

# ─────────────────────────────────────────────
# Friction Surface Endpoints
# ─────────────────────────────────────────────

@app.post("/api/friction/calculate")
async def calculate_friction(request: FrictionRequest):
    """Calculate friction costs for terrain cells"""
    try:
        mode = TransportMode(request.mode)
        season = SeasonalPhase(request.season)
        engine = FrictionEngine(mode=mode, season=season)
        
        results = []
        for cell_data in request.cells:
            cell = TerrainCell(
                lat=cell_data.lat,
                lng=cell_data.lng,
                elevation_m=cell_data.elevation_m,
                slope_deg=cell_data.slope_deg,
                land_cover=LandCover(cell_data.land_cover),
                river_present=cell_data.river_present,
                river_width_m=cell_data.river_width_m,
                flood_probability=cell_data.flood_probability,
                rainfall_7d_mm=cell_data.rainfall_7d_mm,
                road_quality=cell_data.road_quality,
                conflict_risk=cell_data.conflict_risk,
            )
            
            friction = engine.compute_cell_friction(cell)
            results.append({
                "lat": cell.lat,
                "lng": cell.lng,
                "friction_cost": friction,
                "passable": friction < 50.0,
            })
        
        return {"success": True, "data": results}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/friction/modes")
async def get_transport_modes():
    """Get available transport modes"""
    return {
        "success": True,
        "data": [mode.value for mode in TransportMode]
    }

@app.get("/api/friction/seasons")
async def get_seasonal_phases():
    """Get available seasonal phases"""
    return {
        "success": True,
        "data": [season.value for season in SeasonalPhase]
    }

# ─────────────────────────────────────────────
# Explainability Endpoints
# ─────────────────────────────────────────────

@app.post("/api/explainability/analyze")
async def analyze_corridor(request: CorridorAnalysisRequest):
    """Generate explainability trace for corridor"""
    try:
        engine = ExplainabilityEngine()
        
        # Convert evidence to EvidenceAtom objects
        evidence_atoms = []
        for ev in request.evidence:
            atom = EvidenceAtom(
                evidence_type=EvidenceType(ev.get("type", "health_signal")),
                description=ev.get("description", ""),
                weight=ev.get("weight", 0.125),
                source=ev.get("source", "Unknown"),
                confidence=ev.get("confidence", 0.5),
                node_ids=[request.from_node, request.to_node],
            )
            evidence_atoms.append(atom)
        
        # Synthesize corridor score
        score = engine.synthesize_corridor_score(
            corridor_id=request.corridor_id,
            start_node=request.from_node,
            end_node=request.to_node,
            evidence=evidence_atoms,
        )
        
        # Generate trace
        trace = engine.generate_trace(score)
        
        return {
            "success": True,
            "data": {
                "corridor_id": score.corridor_id,
                "score": score.corridor_score,
                "risk_class": score.risk_class.value,
                "component_scores": {
                    "gravity": score.gravity_score,
                    "diffusion": score.diffusion_score,
                    "centrality": score.centrality_score,
                    "hmm": score.hmm_score,
                    "seasonal": score.seasonal_score,
                    "linguistic": score.linguistic_score,
                    "entropy": score.entropy_score,
                    "friction": score.friction_score,
                },
                "trace": trace,
                "phantom_poe_activated": score.phantom_poe_activated,
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/explainability/evidence-types")
async def get_evidence_types():
    """Get available evidence types"""
    return {
        "success": True,
        "data": [ev_type.value for ev_type in EvidenceType]
    }

# ─────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "engine": "mo-border-phantom-001",
        "version": "1.0.0",
        "services": {
            "friction_surface": "operational",
            "explainability": "operational",
        }
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Phantom POE Engine API",
        "engine": "mo-border-phantom-001",
        "status": "online",
        "docs": "/docs",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
