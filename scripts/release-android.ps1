$ErrorActionPreference = 'Stop'

# Check signing before preparing the app; never silently generate an unsigned release.
foreach ($name in @('ANDROID_KEYSTORE', 'ANDROID_KEY_ALIAS', 'ANDROID_KEYSTORE_PASSWORD')) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        throw "Falta $name. Configura la firma de subida en el entorno antes de generar el AAB."
    }
}
if (-not [IO.Path]::IsPathRooted($env:ANDROID_KEYSTORE) -or
    -not (Test-Path -LiteralPath $env:ANDROID_KEYSTORE -PathType Leaf)) {
    throw 'ANDROID_KEYSTORE debe ser la ruta absoluta de un keystore existente.'
}

Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot/prepare-android.ps1"
    if ($LASTEXITCODE -ne 0) { throw 'Falló la preparación. No se generó el release.' }

    Push-Location android
    try {
        & ./gradlew.bat --no-daemon lintRelease bundleRelease
        if ($LASTEXITCODE -ne 0) { throw 'Falló la verificación o compilación Android.' }
    } finally {
        Pop-Location
    }
    Write-Host 'AAB: android/app/build/outputs/bundle/release/app-release.aab'
    Write-Host 'Conserva android/app/build/outputs/mapping/release junto al AAB y el commit utilizado.'
    & git rev-parse HEAD
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo identificar el commit del release.' }
} finally {
    Pop-Location
}
