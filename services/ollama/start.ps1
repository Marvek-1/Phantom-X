# Phantom POE Engine - Ollama Service Launcher
# Engine: mo-border-phantom-001
# MoStar DCX Trinity: DCX0 (Mind) / DCX1 (Soul) / DCX2 (Body)

Write-Host "`n  🧠💫🌍  MoStar DCX Trinity — Ollama AI Service" -ForegroundColor Cyan
Write-Host "  Engine: mo-border-phantom-001`n" -ForegroundColor Gray

# Check if Ollama is installed
$ollamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollamaInstalled) {
    Write-Host "  ✗ Ollama is not installed." -ForegroundColor Red
    Write-Host "  📥 Download from: https://ollama.ai/download`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "  ✓ Ollama is installed" -ForegroundColor Green

# Start Ollama server
Write-Host "  ✓ Starting Ollama server..." -ForegroundColor Green
Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden

Start-Sleep -Seconds 3

# Health check
try {
    $health = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -ErrorAction Stop
    Write-Host "  ✓ Ollama server is online`n" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Ollama server may still be starting...`n" -ForegroundColor Yellow
}

# Pull MoStar DCX Trinity models
Write-Host "  🔥 Pulling MoStar DCX Trinity models..." -ForegroundColor Cyan
Write-Host "  This may take a few minutes on first run.`n" -ForegroundColor Gray

$models = @("Mostar/mostar-ai:dcx0", "Mostar/mostar-ai:dcx1", "Mostar/mostar-ai:dcx2")

foreach ($model in $models) {
    Write-Host "  📦 Pulling $model..." -ForegroundColor Yellow
    ollama pull $model 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $model ready" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ $model not available (using fallback)" -ForegroundColor Yellow
    }
}

Write-Host "`n  🌐 Ollama API: http://localhost:11434" -ForegroundColor Gray
Write-Host "  🧠 DCX0 (Mind): Corridor Intelligence" -ForegroundColor Gray
Write-Host "  💫 DCX1 (Soul): Signal Analysis" -ForegroundColor Gray
Write-Host "  🌍 DCX2 (Body): Terrain & Mobility`n" -ForegroundColor Gray

Write-Host "  ✓ MoStar DCX Trinity is ready`n" -ForegroundColor Green
