# Iniciar mensaje de proceso de actualización
#Descargar cambios del repositorio
 Write-Host "-------------------------------- Descargando cambios del repositorio -------------------------------- /n"
 git pull

#Actualizar dependencias
 Write-Host "-------------------------------- Actualizando dependencias -------------------------------- /n"
 npm.cmd ci

#Actualizar build
 Write-Host "-------------------------------- Compilando y generando el build de la aplicacion -------------------------------- /n"

 npm.cmd run build

#sincronizar con android studio
 Write-Host "-------------------------------- Sincronizando con android studio -------------------------------- /n"
 npx.cmd cap sync android

# Abrir Android Studio
 Write-Host "-------------------------------- Abriendo Android Studio -------------------------------- /n"

 npx.cmd cap open android