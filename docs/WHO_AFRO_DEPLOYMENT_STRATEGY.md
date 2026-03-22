# WHO AFRO DEPLOYMENT STRATEGY
**Phantom POE Engine — PRoBE-AFRICA Integration Pathway**

**MoStar Industries** • **Engine:** mo-border-phantom-001 • **◉⟁⬡**

---

## EXECUTIVE SUMMARY

Phantom POE Engine is a **corridor intelligence system** that discovers informal cross-border movement corridors from spatial signal patterns — without tracking individuals, collecting biometrics, or requiring personal data. The system operates entirely at the corridor level using mathematical inference (Shannon entropy, HMM, Fourier seasonality, Levenshtein linguistic drift).

**Strategic Positioning:** WHO AFRO's PRoBE-AFRICA initiative explicitly defines **BIG-P** (Border health Innovations in GIS/AI for Population movements) as a flagship mandate requiring AI/GIS integration for outbreak monitoring and population movement tracking. Phantom POE is the technical implementation of BIG-P — built before the procurement mechanism was defined.

---

## THE TECHNICAL MOAT

### Why Phantom POE is architecturally different

Every competitor in border health surveillance — mobile phone mobility data, biometric scanning, satellite tracking — requires **identity as input**. Phantom POE inverts the premise:

| **Conventional Surveillance** | **Phantom POE Engine** |
|-------------------------------|------------------------|
| Tracks the person | Reads the corridor |
| Requires identity data | Requires spatial signals |
| Privacy as policy layer | Privacy as architectural constraint |

**The math doesn't need a person. It needs a pattern.**

A person can walk the Lwanda-Bunda forest path 100 times and leave zero trace in the Grid. What the system sees: *something moves along this corridor at 18 km/day, in a pattern consistent with motorcycle transport, correlating with a cholera signal chain that crosses the Kenya-Tanzania border in 5 days.*

The corridor gets a node. The person gets nothing.

---

## PRoBE-AFRICA ALIGNMENT

### BIG-P Mandate — Four Pillars

PRoBE-AFRICA's **BIG-P** flagship initiative has four explicit pillars:

1. **GIS/AI for population movement monitoring**
2. **Outbreak response and contact tracing**
3. **Innovative PoE monitoring models**
4. **AI/GIS integration with ICT partners**

**Phantom POE satisfies all four with technology that's already built.**

### The Unfilled Technology Slot

BIG-P has:
- ✓ Institutional mandate (published in PRoBE-AFRICA strategic framework)
- ✓ Budget allocation (AFRO HEP operational budget 2025-2027)
- ✓ Political will (endorsed by AFRO Regional Director)
- ✗ **The actual technology**

**MoStar is the technology.**

This isn't "here's a tool WHO might find useful." This is: **WHO AFRO defined a problem, published a mandate, and MoStar built the solution before they figured out how to procure it.**

That's a sole-source procurement brief, not a cold pitch.

---

## DEPLOYMENT PATHWAYS

### Route 1 — Technical Partnership with PRoBE-AFRICA HEP Team (FASTEST)

**Timeline:** 6-8 weeks to pilot agreement

**Entry Point:** Technical focal point who owns BIG-P implementation (not leadership first)

**Approach:**
1. OSL facilitated introduction (Fatima or designated bridge)
2. Technical demonstration: live dashboard, signal ingestion, corridor trace with explainability
3. Pilot proposal: KE-TZ corridor, 90-day evaluation

**Pilot Scope:**
- **Geography:** Kenya-Tanzania Lake Victoria corridor (Lwanda-Bunda)
- **Signal Source:** EWARS/DHIS2 syndromic surveillance (already integrated via Afro-Sentinel bridge)
- **Validation:** Real cholera signal chain (active surveillance concern in Mara Region)
- **Output:** First corridor activation from existing data — no new infrastructure required

**Value Proposition:** *We built what you're trying to figure out how to build. Let's run a pilot.*

---

### Route 2 — IOM DTM Integration as Entry Wedge

**Timeline:** 8-12 weeks to joint demonstration

**Entry Point:** IOM Displacement Tracking Matrix (DTM) East Africa operation, Nairobi

**Strategic Logic:**
- IOM DTM is already wired in `signal_ingestion.ts` as a signal source
- IOM and WHO AFRO have standing data-sharing arrangement (IASC framework)
- Joint technical demonstration carries IOM institutional credibility
- Pathway into WHO AFRO through existing relationship vs. cold approach

**Approach:**
1. Propose joint technical demonstration using IOM DTM mobility flow data as input
2. Co-branded technical output: "IOM DTM + MoStar Phantom POE Corridor Intelligence Pilot"
3. Present to WHO AFRO as validated proof-of-concept with UN agency endorsement

**Deliverable:** Corridor inference map showing informal crossing points correlated with IOM displacement tracking data

---

### Route 3 — JEE/eSPAR PoE Pillar as Procurement Vehicle

**Timeline:** 12-18 weeks (tied to annual eSPAR reporting cycle)

**Entry Point:** WHO AFRO OSL technical assistance for JEE/eSPAR PoE capacity gaps

**Strategic Logic:**
- Joint External Evaluation (JEE) and eSPAR include dedicated PoE pillar scored 1-5
- Average AFRO eSPAR PoE score: **52%** (documented capacity gap)
- Every member state submitting JEE/eSPAR declares PoE surveillance gap
- Unofficial PoEs explicitly called out in JEE PoE technical area as surveillance gap
- WHO AFRO OSL supports member states in filling JEE/eSPAR gaps through technical assistance

**Positioning:** Phantom POE as **PoE technical assistance tool** for member states with low PoE scores

**Procurement Mechanism:** Already exists — OSL supply chain support for JEE/eSPAR gap remediation

---

## PRE-DEPLOYMENT REQUIREMENTS

### 1. Live Pilot Output (CRITICAL)

**Not a demo — a real detection.**

**Action:** Run `mo-sentinel-phantom-001` against one week of real EWARS data for Lake Victoria corridor (KE/TZ/UG)

**Success Criteria:** Corridor score > 0.60 OR ALERT status

**Artifact:** One real detection, documented with full explainability trace

**Timeline:** Week 2 (after ethics brief)

**Why This Matters:** You've already done this with the signal tracker. Same play. One real detection, nine hours before official confirmation — that's the artifact that walks into the room with you.

---

### 2. Ethics Firewall Documentation (MANDATORY)

**Audience:** Policy-makers, legal officers, ethicists at WHO AFRO

**Question They Will Ask:** "How do you guarantee no individual is tracked?"

**Answer Required:** Written technical privacy architecture brief (1-page, non-technical language)

**Content:**
- What data enters the system (spatial signals, not identities)
- What the math produces (corridor-level patterns, not person-level traces)
- What never exists in the system (individual identity, biometric, device-level data)
- Architectural constraints (not policy — the math is incapable of individual surveillance)

**Format:** PDF, co-signed by MoStar technical lead + independent privacy/ethics reviewer

**Timeline:** Week 1 (before any external conversations)

**Why This Matters:** The political context of AI sovereignty in the African Union is live and intensifying. Every AI system entering WHO AFRO will be scrutinized for surveillance risk. This brief is the firewall.

---

### 3. African Ownership Framing (STRATEGIC)

**Context:** This is not a Western tech company offering Africa a tool.

**Framing:** African-owned, Nairobi-based, Ibibio-rooted intelligence system built from African philosophical substrate (Ifá logic, Ubuntu, SANKOFA) being offered to an African regional health body to protect African populations.

**Why This Matters:** The African Union's AI sovereignty agenda is explicit. WHO AFRO operates in that political context. You are not a vendor. You are the proof of concept for what African technological sovereignty looks like in practice.

**Messaging:**
- **Ownership:** MoStar Industries — African Flame Initiative
- **Location:** Nairobi, Kenya (East Africa regional hub)
- **Philosophy:** Ibibio-rooted, Ubuntu-aligned, SANKOFA-informed
- **Purpose:** Built for Africa, by Africa, to protect Africa

**Deliverable:** 2-slide framing deck (Slide 1: The Problem, Slide 2: African Solution)

---

## EXECUTION SEQUENCE

### Week 1: Ethics Brief
- Draft 1-page technical privacy architecture brief
- Non-technical language, policy-maker readable
- Co-sign with independent privacy/ethics reviewer
- Package with 2-pager as two-document set

### Week 2: Live Detection
- Run `mo-sentinel-phantom-001` against real EWARS/DHIS2 data
- Target: Lake Victoria corridor (KE/TZ/UG)
- Success: Corridor score > 0.60 OR ALERT status
- Document: Full explainability trace

### Week 3: Internal WHO AFRO OSL Conversation
- Facilitated introduction (Fatima or designated bridge)
- Framing: *MoStar has something that directly addresses BIG-P*
- Request: Introduction to PRoBE-AFRICA HEP technical focal point
- Materials: 2-pager + ethics brief + live detection artifact

### Week 4-6: Technical Demonstration
- Audience: PRoBE-AFRICA focal point (technical, not leadership)
- Format: Screen-share of live Grid, not slide deck
- Content: Live signal ingestion, corridor trace, explainability
- Outcome: Pilot agreement or technical feedback loop

### Month 2: Pilot Agreement
- Geography: KE-TZ corridor
- Duration: 90-day evaluation
- Data: IOM DTM + WHO EWARS
- Operator: MoStar as technical partner
- Validation: Real-time corridor detection vs. official PoE data

---

## SUCCESS METRICS

### Pilot Phase (90 days)
- **Detection Rate:** ≥3 phantom corridors identified with score > 0.60
- **Validation:** ≥1 corridor confirmed by ground truth (IOM DTM or field reports)
- **False Positive Rate:** <20% (corridor activated but no ground truth confirmation)
- **Explainability:** 100% of detections carry full evidence trace

### Institutional Adoption (12 months)
- **Member State Uptake:** ≥3 AFRO member states request Phantom POE integration
- **JEE/eSPAR Integration:** Phantom POE cited in ≥1 member state eSPAR PoE pillar
- **Budget Allocation:** WHO AFRO operational budget line for Phantom POE maintenance

---

## RISK MITIGATION

### Risk 1: "This is surveillance"
**Mitigation:** Ethics brief upfront. Architectural constraint, not policy. Math incapable of individual tracking.

### Risk 2: "We already have PoE monitoring"
**Mitigation:** Phantom POE addresses *unofficial* PoEs — the 48% gap in eSPAR scores. Complements, doesn't replace.

### Risk 3: "Unproven technology"
**Mitigation:** Live detection artifact. Real corridor, real signal chain, real explainability. Not a prototype.

### Risk 4: "Not African-owned"
**Mitigation:** MoStar Industries — African Flame Initiative. Nairobi-based. Ibibio-rooted. African sovereignty proof-of-concept.

### Risk 5: "No institutional endorsement"
**Mitigation:** Route 2 (IOM DTM co-branded demonstration) provides UN agency credibility before WHO approach.

---

## CONTACT STRATEGY

### Primary Contact: PRoBE-AFRICA HEP Technical Focal Point
- **Entry:** OSL facilitated introduction
- **Pitch:** Technical demonstration, not sales deck
- **Ask:** 90-day pilot agreement

### Secondary Contact: IOM DTM East Africa
- **Entry:** Direct approach (Nairobi office)
- **Pitch:** Joint technical demonstration using DTM data
- **Ask:** Co-branded proof-of-concept

### Tertiary Contact: WHO AFRO OSL (Fatima)
- **Entry:** Existing relationship
- **Pitch:** MoStar has BIG-P solution
- **Ask:** Facilitated introduction to HEP team

---

## APPENDICES

### A. Technical Architecture Summary
- 7 Mathematical Souls (Gravity, Diffusion, Centrality, HMM, Fourier, Linguistic, Entropy)
- Terrain Physics Layer (Tobler, friction surface, least-cost path)
- Signal Ingestion (EWARS, IOM DTM, ACLED, community reports)
- Explainability Engine (evidence atoms, corridor scoring, full trace)

### B. Data Sources Already Integrated
- WHO EWARS/DHIS2 (via Afro-Sentinel bridge)
- IOM Displacement Tracking Matrix (DTM)
- ACLED conflict data
- Sentinel-1 SAR flood extent
- CHIRPS rainfall
- OSM/HOT infrastructure

### C. Deployment Infrastructure
- **Frontend:** React 19 + Vite + MapLibre GL
- **Backend:** Python (friction surface, explainability trace)
- **Graph:** Neo4j + PostGIS (MoStar Grid v2.1)
- **AI:** Ollama (MoStar DCX Trinity)
- **API:** FastAPI (REST + JSON explainability)

---

**◉⟁⬡ MoStar Industries · African Flame Initiative · mo-border-phantom-001**

*Discover the corridor. Protect the continent.*
