$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    $estado = & git status --porcelain
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar el repositorio.' }
    if ($estado) {
        & git status --short
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar el estado de Git.' }
        $mensaje = Read-Host 'Escribe el mensaje del commit'
        if ([string]::IsNullOrWhiteSpace($mensaje)) { throw 'El mensaje del commit no puede estar vacío.' }
        & git add .
        if ($LASTEXITCODE -ne 0) { throw 'No se pudieron preparar los cambios.' }
        & git commit -m $mensaje
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el commit.' }
        & git push
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo subir el commit.' }
    }
    & git pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar el repositorio.' }

    # Rebuild even when Git is already up to date.
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot/scripts/prepare-android.ps1" -OpenStudio
    if ($LASTEXITCODE -ne 0) { throw 'Falló la preparación Android.' }
} finally {
    Pop-Location
}
