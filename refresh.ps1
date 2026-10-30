$ErrorActionPreference = 'Stop'
& powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot/scripts/prepare-android.ps1" -OpenStudio
exit $LASTEXITCODE
