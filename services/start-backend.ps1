# MoStar Industries - Backend Services Boot
# Save this file to: whisper-paths-engine\services\start-backend.ps1
# Run from project root: .\services\start-backend.ps1

$ROOT     = Split-Path -Parent $PSScriptRoot
$SERVICES = $PSScriptRoot

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  MoStar Industries - Backend Services Boot" -ForegroundColor Cyan
Write-Host "  Root: $ROOT" -ForegroundColor DarkGray
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  LAYER 0 - Data Conduit" -ForegroundColor Yellow
Write-Host "  LAYER 1 - Woo + Registry (Frost, Gates, Neo4j)" -ForegroundColor Yellow
Write-Host "  LAYER 2 - DCX Trinity (Mind / Soul / Body)" -ForegroundColor Yellow
Write-Host ""

# STEP 1: Neo4j
Write-Host "  STEP 1 - Neo4j" -ForegroundColor White
$neo4jRunning = Test-NetConnection -ComputerName localhost -Port 7687 -WarningAction SilentlyContinue
if ($neo4jRunning.TcpTestSucceeded) {
    Write-Host "  [OK] Neo4j running on bolt://localhost:7687" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Neo4j not detected - start Neo4j Desktop" -ForegroundColor Yellow
}
Write-Host ""

# STEP 2: Ollama
Write-Host "  STEP 2 - Ollama (DCX Trinity)" -ForegroundColor White
$ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
if ($ollamaCmd) {
    $ollamaRunning = Test-NetConnection -ComputerName localhost -Port 11434 -WarningAction SilentlyContinue
    if ($ollamaRunning.TcpTestSucceeded) {
        Write-Host "  [OK] Ollama running on http://localhost:11434" -ForegroundColor Green
    } else {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "ollama serve" -WindowStyle Normal
        Start-Sleep -Seconds 3
        Write-Host "  [OK] Ollama server launched" -ForegroundColor Green
    }
    $models = ollama list 2>$null
    if ($models -match "mostar-ai") {
        Write-Host "  [OK] Mostar/mostar-ai detected - Trinity is LIVE" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Run: ollama pull Mostar/mostar-ai:dcx0" -ForegroundColor Yellow
        Write-Host "         Run: ollama pull Mostar/mostar-ai:dcx1" -ForegroundColor Yellow
        Write-Host "         Run: ollama pull Mostar/mostar-ai:dcx2" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARN] Ollama not found - download from https://ollama.ai" -ForegroundColor Yellow
}
Write-Host ""

# STEP 3: Python API
Write-Host "  STEP 3 - Python API (FastAPI)" -ForegroundColor White
$serverPy = Join-Path $SERVICES "python-api\server.py"
if (Test-Path $serverPy) {
    $pyPath = Join-Path $SERVICES "python-api"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$pyPath'; python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000" -WindowStyle Normal
    Write-Host "  [OK] FastAPI launching on http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host "  [WARN] server.py not found at services\python-api\server.py" -ForegroundColor Yellow
}
Write-Host ""

# STEP 4: MoStar Boot
Write-Host "  STEP 4 - MoStar Boot (Data Conduit + Phantom POE)" -ForegroundColor White
$bootTs = Join-Path $ROOT "src\data\mostar.boot.ts"
if (Test-Path $bootTs) {
    Write-Host "  [OK] mostar.boot.ts found at: $bootTs" -ForegroundColor Green
    Write-Host "  [INFO] Run manually: npx tsx src/data/mostar.boot.ts" -ForegroundColor DarkGray
} else {
    Write-Host "  [INFO] mostar.boot.ts not found at: $bootTs" -ForegroundColor DarkGray
}
Write-Host ""

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  Python API:   http://localhost:8000" -ForegroundColor White
Write-Host "  Neo4j:        http://localhost:7474" -ForegroundColor White
Write-Host "  Ollama:       http://localhost:11434" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  Data Conduit ready. Fire ignition required." -ForegroundColor Yellow
Write-Host ""
