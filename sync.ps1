Write-Host "Consultando el estado del repositorio"

$estado = git status --porcelain

if (-not $estado) {
    Write-Host "No hay cambios en el repositorio"
} else {
    Write-Host "Se han detectado cambios en el repositorio"
    git status --short

    $mensaje = Read-Host "Escribe el mensaje del commit"
    git add .
    git commit -m "$mensaje"
    git push
}

# Debemos revisar si la app esta actualizada con el repositorio remoto
# Si no esta actualizada, debemos descargar los cambios desde el repositorio remoto
Write-Host "Consultando el estado del repositorio"
git fetch

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al consultar el estado del repositorio"
    exit 1
}

$local = git rev-parse HEAD
$remoto = git rev-parse '@{u}'

if ($local -eq $remoto) {
    Write-Host "La aplicación ya esta actualizada"
    exit 0
}

Write-Host "Iniciando descarga de cambios desde el repositorio remoto"
git pull --ff-only

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al descargar los cambios desde el repositorio remoto"
    exit 1
}

# Si esta actualizada, debemos actualizar las librerias pero aprueba de errores
Write-Host "Iniciando actualizacion de librerias"
npm.cmd ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al actualizar las librerias"
    exit 1
}

# Si esta actualizada, debemos buildear la app pero aprueba de errores
Write-Host "Iniciando build de la app"
npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al buildear la app"
    exit 1
}

# Si esta actualizada, debemos sincronizar la app con Android pero aprueba de errores
Write-Host "Iniciando sincronizacion de la app con Android"
npx.cmd cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al sincronizar la app con Android"
    exit 1
}

# Si esta actualizada, debemos abrir Android Studio pero aprueba de errores
Write-Host "Abriendo Android Studio"
npx.cmd cap open android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al abrir Android Studio"
    exit 1
}
