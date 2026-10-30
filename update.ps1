$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & git pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar el repositorio.' }
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot/scripts/prepare-android.ps1" -OpenStudio
    if ($LASTEXITCODE -ne 0) { throw 'Falló la preparación Android.' }
} finally {
    Pop-Location
}
