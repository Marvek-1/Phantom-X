# Phantom POE Engine - Python API Service Launcher
# Engine: mo-border-phantom-001

Write-Host "`n  🜂🜄🜁🜃  MoStar Industries — Python API Service" -ForegroundColor Cyan
Write-Host "  Engine: mo-border-phantom-001`n" -ForegroundColor Gray

# Activate virtual environment
if (Test-Path "..\..\..\.venv\Scripts\Activate.ps1") {
    Write-Host "  ✓ Activating Python virtual environment..." -ForegroundColor Green
    & "..\..\..\.venv\Scripts\Activate.ps1"
} else {
    Write-Host "  ⚠ Virtual environment not found. Using system Python." -ForegroundColor Yellow
}

# Install dependencies
Write-Host "  ✓ Installing dependencies..." -ForegroundColor Green
pip install -q -r ..\..\backend\requirements.txt

# Start FastAPI server
Write-Host "`n  🔥 Starting FastAPI server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "  📚 API docs: http://localhost:8000/docs`n" -ForegroundColor Gray

Set-Location ..\..\backend\api
python server.py
