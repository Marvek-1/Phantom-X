# PHANTOM POE ENGINE
**Corridor Intelligence for Informal Cross-Border Mobility**

**MoStar Industries** • **Engine:** mo-border-phantom-001 • **Version 1.0** • **◉⟁⬡**

---

## THE PROBLEM — Why official border surveillance fails

Across Africa's 47 WHO AFRO member states, the majority of cross-border human movement occurs through **informal corridors**: footpaths, livestock routes, seasonal river crossings, market trails, and forest junctions. These routes are unmapped, unmonitored, and unaccounted for in any official border health or security framework.

When disease spreads across a border, it walks these invisible corridors first. By the time it reaches an official Point of Entry, it has already been circulating for days in the communities the surveillance system never saw.

> *"The border is not where they drew it. It is where people walk."*  
> — Phantom POE Engine design principle

---

## WHAT IS PHANTOM POE ENGINE? — Corridor inference, not people-tracking

Phantom POE Engine is a **corridor intelligence system** developed by MoStar Industries. It discovers informal cross-border movement corridors from indirect signals and landscape physics — **without tracking any individual, collecting any biometric, or requiring any personal data**.

The system operates on a fundamental ethical and scientific distinction:

| **Conventional Surveillance** | **Phantom POE Engine** |
|-------------------------------|------------------------|
| Tracks the person             | Reads the corridor     |

---

## THE 7 MATHEMATICAL SOULS — The scientific engine

Phantom POE Engine is powered by a multidisciplinary inference stack spanning human geography, network science, epidemiology, signal processing, linguistics, and information theory.

| # | Soul | Model | What it detects |
|---|------|-------|-----------------|
| **🜁** | **Gravity** | Spatial Interaction | Population & market pull between settlements |
| **🜂** | **Diffusion** | Hägerstrand / Hawkes | Outbreak timing reconstructs travel path + velocity |
| **🜃** | **Centrality** | Graph Betweenness | High-traffic nodes with no official POE = phantom candidate |
| **🜄** | **HMM** | Hidden Markov Model | Crossing inferred from signals on both sides of border |
| **☿** | **Fourier** | Seasonal Decomposition | 52-week harmonic reveals dormant seasonal corridors |
| **♄** | **Linguistic** | Levenshtein / NLP | Terminology drift across nodes implies cultural corridor |
| **♃** | **Entropy** | Shannon Entropy | Signal cluster anomaly = corridor activation alert |
| **⛰** | **Terrain** | Friction / Least-Cost Path | Tobler + hydrology + land cover = physical path physics |

---

## COMPUTATIONAL PIPELINE — Signal to alert in 5 layers

```
Layer 1 — Signal Ingestion
  ↓ Disease reports, market events, transport alerts, community chatter, remote sensing

Layer 2 — Spatial Intelligence
  ↓ Gravity model, diffusion reconstruction, graph centrality — mobility physics computed

Layer 3 — Hidden State Inference
  ↓ HMM crossing probability, linguistic drift boundary detection

Layer 4 — Temporal Intelligence
  ↓ Fourier seasonal weighting, Hawkes self-exciting spread

Layer 5 — Anomaly + Output
  ↓ Entropy spike detection → PHANTOM_POE_ACTIVATED → corridor score + explainability trace
```

---

## EXPLAINABILITY BY DESIGN — Every score is auditable

Every corridor score produced by Phantom POE Engine carries a **full explainability trace**. No black boxes. No opaque probabilities.

**Example output:**

```
CORRIDOR-KE-TZ-047   |   Village Lwanda (KE) → Village Bunda (TZ)
Score: 0.7887   [HIGH]   ◉ PHANTOM POE ACTIVATED

  · 3 sequential cholera signals over 5 days
  · Velocity 18 km/day — motorcycle corridor inferred
  · Forest junction betweenness 0.74 — no official POE
  · Linguistic drift: zazzabi → homa across 3 nodes
  · Entropy spike ΔH = 1.42 (threshold 0.80)

  No individual identity. No biometric. Corridor-level inference only.
```

---

## TECHNOLOGY STACK — Open, auditable, Africa-deployable

| Component | Technology |
|-----------|------------|
| **Graph substrate** | Neo4j + PostGIS (MoStar Grid v2.1) |
| **Terrain physics** | Rasterio + GDAL + xarray + scipy.ndimage |
| **Bayesian inference** | PyMC — uncertainty preserved, not hidden |
| **Remote sensing** | Sentinel-1 SAR, Sentinel-2, Copernicus DEM, CHIRPS |
| **Geospatial data** | OSM / HOT, HydroRIVERS, WorldPop, GADM |
| **NLP / signals** | Multilingual transformers, custom Ibibio-rooted lexicon |
| **API layer** | FastAPI — REST + JSON explainability output |
| **Frontend** | React 19 + Vite + deck.gl / MapLibre GL |

---

## USE CASES — Who this serves

- **Epidemic early warning** — Detect cross-border spread before official PoE detection
- **Border health programmes** — Map informal entry points for surveillance coverage planning
- **Humanitarian logistics** — Route prepositioning supplies through real movement corridors
- **IHR/JEE strengthening** — Evidence base for PoE capacity gap analysis
- **Research & academia** — Novel methodology for informal mobility reconstruction

---

## ETHICS & GOVERNANCE — Privacy-preserving by architecture

Phantom POE Engine was designed from first principles to be **incapable of individual surveillance**. This is not a policy layer applied after the fact — it is an **architectural constraint**:

- ✓ No individual identity, biometric, or device-level data ingested
- ✓ No persistent person-level records created at any layer
- ✓ All inference is corridor-level — aggregate mobility patterns only
- ✓ Uncertainty is displayed, never suppressed
- ✓ Explainability trace mandatory for every score produced
- ✓ Full source provenance logged for every evidence atom

> *"We do not watch people. We listen to where the earth is being walked."*  
> — MoStar Industries

---

## STRATEGIC ALIGNMENT — MoStar Industries and PRoBE-AFRICA

**PRoBE-AFRICA** (WHO AFRO Health Emergency Preparedness Team) explicitly identifies **BIG-P** — Border health Innovations in GIS/AI for Population movements — as a flagship initiative requiring AI/GIS integration for monitoring outbreaks and population movements.

Phantom POE Engine is the independent, African-owned technical implementation of BIG-P — developed before the PRoBE-AFRICA document was published, from first principles grounded in African mobility intelligence.

| **PRoBE-AFRICA BIG-P Mandate** | **Phantom POE Engine Response** |
|--------------------------------|----------------------------------|
| GIS/AI for population movement monitoring | Graph intelligence + 7-model mobility inference |
| Outbreak response + contact tracing | Diffusion reconstruction + HMM path inference |
| Innovative PoE/border health monitoring models | Phantom corridor discovery engine — fully built |

---

## PROJECT STRUCTURE

```
whisper-paths-engine/
├── backend/                    # Python backend modules
│   ├── friction_surface.py    # Terrain physics & least-cost path
│   └── explainability_trace.py # Corridor scoring & evidence trail
├── src/
│   ├── components/
│   │   └── PhantomMap.tsx     # MapTiler globe visualization
│   ├── data/
│   │   └── phantom-nodes.ts   # Node & corridor data
│   └── types/                  # TypeScript type definitions
├── public/                     # Static assets
└── README.md                   # This file
```

---

## DEVELOPMENT SETUP

### Prerequisites
- Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Python 3.10+ (for backend modules)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd whisper-paths-engine

# Install frontend dependencies
npm install

# Start development server
npm run dev
```

### Python Backend (Optional)

```sh
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies (if requirements.txt exists)
pip install -r requirements.txt

# Run friction surface demo
python backend/friction_surface.py

# Run explainability trace demo
python backend/explainability_trace.py
```

---

## OWNERSHIP & AVAILABILITY

| | |
|---|---|
| **Product owner** | MoStar Industries — African Flame Initiative |
| **Engine ID** | mo-border-phantom-001 |
| **Substrate** | MoStar Grid v2.1-soulprinted — Neo4j, 740 nodes, 0.97 coherence |
| **Availability** | Partnership, licensing, and deployment discussions open |
| **Contact** | MoStar Industries · mostarindustries.com |

---

**◉⟁⬡ MoStar Industries · African Flame Initiative · mo-border-phantom-001**

*Discover the corridor. Protect the continent.*
