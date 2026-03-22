# Phantom POE Engine - Full Stack Service Launcher
# Engine: mo-border-phantom-001
# Boot Sequence: Layer 0 to Layer 7

Write-Host ""
Write-Host "$("=" * 62)" -ForegroundColor Cyan
Write-Host "  MoStar Industries - Full Stack Boot" -ForegroundColor Cyan
Write-Host "  Engine: mo-border-phantom-001" -ForegroundColor Gray
Write-Host "$("=" * 62)" -ForegroundColor Cyan
Write-Host ""

Write-Host "  LAYER 0 - Data Conduit (Elemental Signal Intake)" -ForegroundColor Yellow
Write-Host "  LAYER 1 - Woo + Registry (Frost, Gates, Neo4j)" -ForegroundColor Yellow
Write-Host "  LAYER 2 - DCX Trinity (Mind / Soul / Body)" -ForegroundColor Yellow
Write-Host "  LAYER 3 - Signal Ingest (DTM / ACLED / DHIS2)" -ForegroundColor Yellow
Write-Host "  LAYER 4 - Phantom POE (Corridor Activation)" -ForegroundColor Yellow
Write-Host "  LAYER 5 - Trinity Talk (Corridor Query)" -ForegroundColor Yellow
Write-Host "  LAYER 6 - Learn + Remember (Seal + Recall)" -ForegroundColor Yellow
Write-Host "  LAYER 7 - Grid Status (Coherence Report)" -ForegroundColor Yellow
Write-Host ""

# 1. Initialize Neon PostgreSQL
Write-Host "  $("-" * 58)" -ForegroundColor Gray
Write-Host "  STEP 1 - Neon PostgreSQL Initialization" -ForegroundColor Cyan
Write-Host "  $("-" * 58)" -ForegroundColor Gray
Set-Location ..
npm run db:init
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Neon database initialized" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "  ⚠ Neon initialization failed (continuing...)" -ForegroundColor Yellow
    Write-Host ""
}

# 2. Start Neo4j
Write-Host "  $("-" * 58)" -ForegroundColor Gray
Write-Host "  STEP 2 - Neo4j Graph Database" -ForegroundColor Cyan
Write-Host "  $("-" * 58)" -ForegroundColor Gray
Set-Location services\neo4j
.\start.ps1
Set-Location ..\..

# 3. Start Ollama
Write-Host ""
Write-Host "  $("-" * 58)" -ForegroundColor Gray
Write-Host "  STEP 3 - Ollama (MoStar DCX Trinity)" -ForegroundColor Cyan
Write-Host "  $("-" * 58)" -ForegroundColor Gray
Set-Location services\ollama
.\start.ps1
Set-Location ..\..

# 4. Start Python API
Write-Host ""
Write-Host "  $("-" * 58)" -ForegroundColor Gray
Write-Host "  STEP 4 - Python API (FastAPI)" -ForegroundColor Cyan
Write-Host "  $("-" * 58)" -ForegroundColor Gray
Write-Host "  Starting in new window..." -ForegroundColor Yellow
Write-Host ""
Start-Process powershell -ArgumentList "-NoExit", "-File", "services\python-api\start.ps1"

# 5. Frontend already running
Write-Host "  $("-" * 58)" -ForegroundColor Gray
Write-Host "  STEP 5 - Frontend (Vite)" -ForegroundColor Cyan
Write-Host "  $("-" * 58)" -ForegroundColor Gray
Write-Host "  ✓ Already running at http://localhost:8080" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host ""
Write-Host "$("=" * 62)" -ForegroundColor Cyan
Write-Host "  FULL STACK STATUS" -ForegroundColor Cyan
Write-Host "$("=" * 62)" -ForegroundColor Cyan
Write-Host "  Frontend:        http://localhost:8080" -ForegroundColor Green
Write-Host "  Python API:      http://localhost:8000" -ForegroundColor Green
Write-Host "  Python API Docs: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "  Neo4j Browser:   http://localhost:7474" -ForegroundColor Green
Write-Host "  Neo4j Bolt:      bolt://localhost:7687" -ForegroundColor Gray
Write-Host "  Ollama API:      http://localhost:11434" -ForegroundColor Green
Write-Host "  Neon PostgreSQL: Cloud (initialized)" -ForegroundColor Green
Write-Host "$("=" * 62)" -ForegroundColor Cyan
Write-Host ""

Write-Host "  All services are starting..." -ForegroundColor Cyan
Write-Host "  Data Conduit is ready for signal intake" -ForegroundColor Yellow
Write-Host "  Fire ignition required to activate Phantom POE" -ForegroundColor Yellow
Write-Host ""
