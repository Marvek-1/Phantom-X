# Phantom POE Engine - Neo4j Service Launcher
# Engine: mo-border-phantom-001

Write-Host "`n  ◉⟁⬡  MoStar Grid v2.1 — Neo4j Graph Database" -ForegroundColor Cyan
Write-Host "  Engine: mo-border-phantom-001`n" -ForegroundColor Gray

# Check if Docker is running
$dockerRunning = docker info 2>&1 | Select-String "Server Version"
if (-not $dockerRunning) {
    Write-Host "  ✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ Docker is running" -ForegroundColor Green

# Start Neo4j container
Write-Host "  ✓ Starting Neo4j container..." -ForegroundColor Green
docker-compose up -d

Write-Host "`n  🔥 Neo4j is starting..." -ForegroundColor Cyan
Write-Host "  🌐 Browser: http://localhost:7474" -ForegroundColor Gray
Write-Host "  🔌 Bolt: bolt://localhost:7687" -ForegroundColor Gray
Write-Host "  👤 User: neo4j" -ForegroundColor Gray
Write-Host "  🔑 Password: mostar123`n" -ForegroundColor Gray

Write-Host "  Waiting for Neo4j to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Health check
$healthCheck = Invoke-WebRequest -Uri "http://localhost:7474" -UseBasicParsing -ErrorAction SilentlyContinue
if ($healthCheck.StatusCode -eq 200) {
    Write-Host "  ✓ Neo4j is online and ready`n" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Neo4j may still be starting. Check http://localhost:7474`n" -ForegroundColor Yellow
}
