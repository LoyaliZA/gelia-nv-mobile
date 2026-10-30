param([switch]$OpenStudio)

$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    Write-Host 'Instalando dependencias del lockfile'
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación de dependencias.' }

    Write-Host 'Compilando recursos web de producción'
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación web. Android no se sincronizó.' }

    Write-Host 'Sincronizando Android con el build recién generado'
    & npx.cmd --no-install cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'Falló la sincronización Android.' }

    if ($OpenStudio) {
        & npx.cmd --no-install cap open android
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo abrir Android Studio.' }
    }
} finally {
    Pop-Location
}
