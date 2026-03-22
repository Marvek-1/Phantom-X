param(
    [ValidateSet("dump", "upload")]
    [string]$Mode = "dump",

    [string]$DatabaseName = "neo4j",
    [string]$DumpToPath = "$env:USERPROFILE\Desktop",
    [string]$Neo4jHome,

    [string]$AuraUri,
    [PSCredential]$AuraCredential,

    [switch]$OverwriteDestination,
    [switch]$SkipRunningCheck
)

$ErrorActionPreference = "Stop"

function Resolve-Neo4jAdminPath {
    param([string]$Neo4jInstallHome)

    $candidates = @()

    if ($Neo4jInstallHome) {
        $candidates += (Join-Path $Neo4jInstallHome "bin\neo4j-admin.bat")
    }

    if ($env:NEO4J_HOME) {
        $candidates += (Join-Path $env:NEO4J_HOME "bin\neo4j-admin.bat")
    }

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    $cmd = Get-Command neo4j-admin.bat -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $cmd2 = Get-Command neo4j-admin -ErrorAction SilentlyContinue
    if ($cmd2) {
        return $cmd2.Source
    }

    $searchRoots = @(
        "$env:USERPROFILE\.Neo4jDesktop",
        "$env:USERPROFILE\OneDrive - World Health Organization\Documents\Dev",
        "$env:LOCALAPPDATA\Programs\Neo4j Desktop",
        "$env:ProgramFiles\Neo4j",
        "$env:ProgramFiles\Neo4j Desktop",
        "$env:ProgramFiles(x86)\Neo4j",
        "$env:ProgramFiles(x86)\Neo4j Desktop"
    )

    foreach ($root in $searchRoots) {
        if (-not (Test-Path $root)) {
            continue
        }

        $found = Get-ChildItem -Path $root -Filter "neo4j-admin.bat" -Recurse -ErrorAction SilentlyContinue |
            Select-Object -First 1 -ExpandProperty FullName

        if ($found) {
            return $found
        }
    }

    throw "Could not find neo4j-admin. Provide -Neo4jHome or set NEO4J_HOME to your Neo4j Desktop DB home."
}

function Assert-DatabaseStopped {
    param([switch]$SkipCheck)

    if ($SkipCheck) {
        Write-Host "[WARN] Skipping running database check on localhost:7687" -ForegroundColor Yellow
        return
    }

    $isRunning = $false
    try {
        $check = Test-NetConnection -ComputerName localhost -Port 7687 -WarningAction SilentlyContinue
        $isRunning = [bool]$check.TcpTestSucceeded
    } catch {
        $isRunning = $false
    }

    if ($isRunning) {
        throw "Neo4j appears to be running on bolt://localhost:7687. Stop the database in Neo4j Desktop, then run again."
    }
}

$neo4jAdmin = Resolve-Neo4jAdminPath -Neo4jInstallHome $Neo4jHome
Assert-DatabaseStopped -SkipCheck:$SkipRunningCheck

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host " Neo4j Desktop -> Aura Export Helper" -ForegroundColor Cyan
Write-Host " Mode: $Mode" -ForegroundColor Gray
Write-Host " Database: $DatabaseName" -ForegroundColor Gray
Write-Host " neo4j-admin: $neo4jAdmin" -ForegroundColor DarkGray
Write-Host "==============================================================" -ForegroundColor Cyan

if ($Mode -eq "dump") {
    if (-not (Test-Path $DumpToPath)) {
        New-Item -ItemType Directory -Path $DumpToPath | Out-Null
    }

    Write-Host "[STEP] Creating dump file at $DumpToPath" -ForegroundColor White
    & $neo4jAdmin database dump $DatabaseName "--to-path=$DumpToPath"

    if ($LASTEXITCODE -ne 0) {
        throw "Dump command failed with exit code $LASTEXITCODE"
    }

    Write-Host "[OK] Dump completed. Upload the generated .dump file in console.neo4j.io -> Import Database" -ForegroundColor Green
    Write-Host "[VERIFY] After import, run in Aura Browser: MATCH (n) RETURN count(n);" -ForegroundColor Gray
    exit 0
}

if (-not $AuraUri) {
    throw "Mode=upload requires -AuraUri (for example neo4j+s://<your-aura-id>.databases.neo4j.io)"
}

if (-not $AuraCredential) {
    throw "Mode=upload requires -AuraCredential (use Get-Credential)"
}

$overwriteFlag = if ($OverwriteDestination) { "--overwrite-destination=true" } else { "--overwrite-destination=false" }
$auraUser = $AuraCredential.UserName
$auraPassword = $AuraCredential.GetNetworkCredential().Password

Write-Host "[STEP] Uploading local database directly to Aura: $AuraUri" -ForegroundColor White
& $neo4jAdmin database upload $DatabaseName "--to-uri=$AuraUri" "--to-user=$auraUser" "--to-password=$auraPassword" $overwriteFlag

if ($LASTEXITCODE -ne 0) {
    throw "Upload command failed with exit code $LASTEXITCODE"
}

Write-Host "[OK] Upload completed." -ForegroundColor Green
Write-Host "[VERIFY] Run in Aura Browser: MATCH (n) RETURN count(n);" -ForegroundColor Gray
