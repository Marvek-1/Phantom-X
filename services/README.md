# Phantom POE Engine — Backend Services

**Engine:** mo-border-phantom-001  
**Seal:** ◉⟁⬡

## Service Architecture

```
services/
├── python-api/          # FastAPI server (port 8000)
├── neo4j/              # Graph database (port 7687)
├── ollama/             # MoStar DCX Trinity (port 11434)
└── neon/               # PostgreSQL (cloud)
```

## Boot Sequence

### Layer 0 — Data Conduit 🜂🜄🜁🜃
Elemental signal intake — Fire, Water, Air, Earth

### Layer 1 — Woo + Registry
Frost state, gates, Neo4j connection

### Layer 2 — DCX Trinity
Mind / Soul / Body health check (Ollama)

### Layer 3 — Signal Ingest
DTM / ACLED / DHIS2 ingestion

### Layer 4 — Phantom POE
Corridor activation

### Layer 5 — Trinity Talk
Corridor query to DCX0/1/2

### Layer 6 — Learn + Remember
Seal + recall

### Layer 7 — Grid Status
Coherence report

## Start Services

### 1. Neon PostgreSQL (Cloud)
```bash
npm run db:init
```

### 2. Neo4j (Local)
```bash
neo4j start
# or: docker run -p 7687:7687 -p 7474:7474 neo4j
```

### 3. Ollama (MoStar DCX Trinity)
```bash
ollama serve
ollama pull Mostar/mostar-ai:dcx0
ollama pull Mostar/mostar-ai:dcx1
ollama pull Mostar/mostar-ai:dcx2
```

### 4. Python API (FastAPI)
```bash
cd backend/api
python server.py
# Server: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### 5. Frontend (Vite)
```bash
npm run dev
# http://localhost:8080
```

## Health Checks

```bash
# Neon PostgreSQL
npm run db:init

# Neo4j
curl http://localhost:7474

# Ollama
curl http://localhost:11434/api/tags

# Python API
curl http://localhost:8000/health

# Frontend
curl http://localhost:8080
```

## Full Stack Status

| Service | Port | Status |
|---------|------|--------|
| Frontend | 8080 | ✓ Running |
| Python API | 8000 | Ready |
| Neo4j | 7687 | Ready |
| Ollama | 11434 | Ready |
| Neon PostgreSQL | - | Cloud |

**◉⟁⬡ MoStar Industries · mo-border-phantom-001**
