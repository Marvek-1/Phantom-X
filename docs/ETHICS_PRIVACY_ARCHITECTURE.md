# PHANTOM POE ENGINE — PRIVACY ARCHITECTURE BRIEF
**Technical Privacy Firewall Documentation**

**MoStar Industries** • **Engine:** mo-border-phantom-001 • **Version 1.0** • **◉⟁⬡**

---

## EXECUTIVE SUMMARY

Phantom POE Engine is **architecturally incapable of individual surveillance**. This is not a policy commitment — it is a mathematical constraint. The system operates exclusively at the corridor level, inferring spatial movement patterns from aggregate signals without collecting, storing, or processing individual identity, biometric data, or device-level information.

**Core Principle:** The math doesn't need a person. It needs a pattern.

---

## WHAT DATA ENTERS THE SYSTEM

Phantom POE Engine ingests **spatial signals**, not individual identities:

### Signal Types
1. **Disease surveillance data** (EWARS/DHIS2)
   - Syndromic case counts by location and date
   - No patient names, IDs, or contact information
   - Aggregated at health facility level

2. **Market activity signals**
   - Price fluctuations across border markets
   - Commodity flow patterns
   - No vendor or buyer identities

3. **Transport observations**
   - Traffic pattern changes at known routes
   - Motorcycle taxi rerouting reports
   - No vehicle registration or driver data

4. **Linguistic drift patterns**
   - Disease terminology shifts across geographic nodes
   - Language boundary detection
   - No speaker identities or conversation content

5. **Remote sensing data**
   - Sentinel-1 SAR flood extent
   - CHIRPS rainfall measurements
   - Land cover classification
   - No human activity tracking

6. **Community reports** (optional)
   - Aggregated observations from health workers
   - No individual reporter identification retained

---

## WHAT THE MATH PRODUCES

The 7 Mathematical Souls operate on **spatial patterns**, not people:

| Soul | Model | Input | Output | Individual Data? |
|------|-------|-------|--------|------------------|
| **Gravity** | Spatial Interaction | Population × market locations | Movement probability between nodes | **NO** |
| **Diffusion** | Hägerstrand | Disease case timing sequence | Travel velocity inference | **NO** |
| **Centrality** | Graph Betweenness | Node connectivity patterns | High-traffic junction identification | **NO** |
| **HMM** | Hidden Markov | Signals on both sides of border | Crossing probability | **NO** |
| **Fourier** | Seasonal Decomposition | 52-week signal history | Seasonal corridor activation | **NO** |
| **Linguistic** | Levenshtein Distance | Terminology across nodes | Cultural boundary detection | **NO** |
| **Entropy** | Shannon Entropy | Signal cluster variance | Anomaly detection | **NO** |
| **Terrain** | Friction Surface | Slope, hydrology, land cover | Least-cost path physics | **NO** |

### Example: Lwanda-Bunda Corridor Detection

**Input Signals:**
- Cholera case reported in Village Lwanda, Kenya (Day 1)
- Cholera case reported in Market Bunda, Tanzania (Day 6)
- Distance: 90 km

**Mathematical Inference:**
- Velocity: 90 km ÷ 5 days = 18 km/day
- Mode inference: Consistent with motorcycle transport
- Corridor score: 0.78 (HIGH)

**What the system knows:**
- *Something* moved along this corridor at 18 km/day
- Pattern consistent with motorcycle transport
- Cholera signal chain crosses Kenya-Tanzania border

**What the system NEVER knows:**
- Who traveled
- How many people
- Individual identities
- Device IDs
- Biometric data

---

## WHAT NEVER EXISTS IN THE SYSTEM

The following data types are **architecturally excluded**:

### Never Collected
- ✗ Individual names or identities
- ✗ Biometric data (fingerprints, facial recognition, iris scans)
- ✗ Device identifiers (IMEI, MAC address, phone numbers)
- ✗ GPS traces of individual movement
- ✗ Social media profiles or content
- ✗ Financial transaction records
- ✗ Communication metadata (call logs, SMS)

### Never Stored
- ✗ Person-level movement histories
- ✗ Individual health records
- ✗ Contact tracing chains at individual level
- ✗ Persistent identifiers linking signals to people

### Never Produced
- ✗ Individual risk scores
- ✗ Person-specific predictions
- ✗ Identity-linked alerts
- ✗ Surveillance target lists

---

## ARCHITECTURAL CONSTRAINTS

### 1. Corridor-Level Aggregation (Mandatory)

All inference operates at the **corridor level**, not the person level:

```
CONVENTIONAL SURVEILLANCE:
Person A → traveled from → Location X → to → Location Y
[Identity-linked trace]

PHANTOM POE ENGINE:
Location X → corridor detected → Location Y
Velocity: 18 km/day | Confidence: 0.78 | Mode: motorcycle
[No identity, no person, no trace]
```

### 2. Signal Anonymization at Ingestion

All incoming signals are **stripped of identifiers** before entering the inference pipeline:

**EWARS Data Example:**
```
INPUT (from DHIS2):
{
  "patient_id": "KE-2025-00147",
  "name": "John Doe",
  "age": 34,
  "location": "Lwanda Health Center",
  "diagnosis": "Cholera",
  "date": "2025-03-12"
}

INGESTED (into Phantom POE):
{
  "location": "Lwanda Health Center",
  "lat": -1.15,
  "lng": 34.23,
  "syndrome": "diarrheal_illness",
  "date": "2025-03-12"
}
```

**Identity fields discarded:** `patient_id`, `name`, `age`

### 3. No Persistent Person-Level Records

The Neo4j graph stores **nodes and corridors**, not people:

**Graph Schema:**
```cypher
// ALLOWED: Spatial nodes
CREATE (n:Node {
  id: "lwanda_ke",
  name: "Lwanda",
  lat: -1.15,
  lng: 34.23,
  type: "village"
})

// ALLOWED: Corridor edges
CREATE (c:Corridor {
  id: "corridor_ke_tz_047",
  from: "lwanda_ke",
  to: "bunda_tz",
  score: 0.78,
  velocity_kmh: 18.0
})

// FORBIDDEN: Person nodes
CREATE (p:Person {  // ← NEVER CREATED
  id: "person_123",
  name: "John Doe"
})
```

### 4. Explainability Without Identity

Every corridor score carries a **full evidence trail** — but the evidence is spatial, not personal:

**Evidence Atom Example:**
```json
{
  "evidence_type": "diffusion_timing",
  "description": "Travel velocity 18 km/day inferred — consistent with motorcycle transport",
  "source": "Phantom POE Engine · Soul 2 · Spatial Diffusion",
  "confidence": 0.84,
  "node_ids": ["lwanda_ke", "bunda_tz"],
  "raw_value": {"velocity_kmh": 18.0}
}
```

**No identity fields.** Evidence references **nodes**, not people.

---

## COMPARISON TO CONVENTIONAL SURVEILLANCE

| Dimension | Conventional Surveillance | Phantom POE Engine |
|-----------|---------------------------|-------------------|
| **Primary Input** | Individual identity (phone, biometric, ID) | Spatial signals (disease, market, terrain) |
| **Tracking Unit** | Person | Corridor |
| **Data Retention** | Persistent person-level records | Corridor-level patterns only |
| **Privacy Mechanism** | Policy (anonymization, consent) | Architecture (math incapable of identity) |
| **Re-identification Risk** | High (linkage attacks possible) | Zero (no identity to re-identify) |
| **Surveillance Capability** | Yes (by design) | No (by constraint) |

---

## REGULATORY COMPLIANCE

### GDPR (EU General Data Protection Regulation)
**Status:** Compliant by design

- **Article 4(1) — Personal Data Definition:** Phantom POE does not process "information relating to an identified or identifiable natural person"
- **Article 9 — Special Categories:** No health data linked to individuals
- **Article 25 — Data Protection by Design:** Privacy embedded in architecture, not policy

### African Union Data Protection Convention
**Status:** Aligned with AU sovereignty principles

- No cross-border transfer of individual data
- African-owned, African-operated system
- Data sovereignty maintained at continental level

### WHO IHR (International Health Regulations)
**Status:** Supports IHR compliance without surveillance

- Enhances PoE capacity (IHR Annex 1B)
- No individual contact tracing (respects privacy)
- Corridor-level intelligence for outbreak response

---

## ETHICAL SAFEGUARDS

### 1. No Mission Creep
The system is **purpose-built for corridor intelligence** and cannot be repurposed for individual surveillance without complete architectural redesign.

### 2. Transparency by Default
Every corridor score includes:
- Full mathematical explanation
- Source data provenance
- Confidence intervals
- Uncertainty quantification

### 3. Community Consent Model
Where community reports are used:
- Aggregated at village/market level
- No individual reporter identification
- Community-level consent, not individual

### 4. Independent Audit Trail
All system operations logged for:
- Technical audit (what math ran, what data entered)
- Ethics review (no identity data processed)
- Accountability (full explainability trace)

---

## TECHNICAL VERIFICATION

### Code-Level Privacy Enforcement

**TypeScript Type System:**
```typescript
// ALLOWED: Corridor-level data
interface CorridorScore {
  corridor_id: string;
  start_node: string;
  end_node: string;
  score: number;
  evidence: EvidenceAtom[];
}

// FORBIDDEN: Person-level data
interface PersonTrace {  // ← TYPE DOES NOT EXIST
  person_id: string;
  movement_history: Location[];
}
```

**Python Data Structures:**
```python
@dataclass
class TerrainCell:
    """Spatial cell — no person data"""
    lat: float
    lng: float
    friction_cost: float
    # NO person_id field
    # NO identity field

@dataclass
class CorridorSegment:
    """Corridor output — no person data"""
    start_lat: float
    end_lat: float
    corridor_confidence: float
    # NO person_id field
    # NO identity field
```

---

## RISK ASSESSMENT

### Risk 1: Signal Re-identification
**Threat:** Could disease case timing be linked back to individuals?

**Mitigation:**
- Minimum 3-case threshold for corridor activation
- Temporal aggregation (daily, not hourly)
- Spatial aggregation (health facility, not household)

### Risk 2: Corridor Misuse
**Threat:** Could corridor intelligence be used for border enforcement against individuals?

**Mitigation:**
- System outputs corridors, not people
- No real-time tracking capability
- Designed for health preparedness, not enforcement

### Risk 3: Data Breach
**Threat:** What if the database is compromised?

**Impact:** Minimal — no individual identities to expose
- Graph contains nodes and corridors only
- No person-level records to leak
- Worst case: corridor locations revealed (already public health information)

---

## CONCLUSION

Phantom POE Engine is **privacy-preserving by architecture**, not policy. The mathematical models operate on spatial patterns and cannot be adapted to track individuals without complete system redesign.

**Key Guarantees:**
1. No individual identity data collected
2. No person-level records stored
3. No individual surveillance capability
4. Full explainability without identity exposure
5. Corridor-level intelligence only

**The system answers:** *Where do informal corridors exist?*

**The system never answers:** *Who crossed the border?*

---

**Technical Contact:** MoStar Industries — African Flame Initiative  
**Ethics Review:** Available upon request  
**Independent Audit:** Open to WHO AFRO legal/ethics review

**◉⟁⬡ MoStar Industries · mo-border-phantom-001**

*Privacy by architecture. Intelligence without surveillance.*
