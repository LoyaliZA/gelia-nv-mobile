# GELIA-NV móvil: fases para preparar el release de Google Play

Revisión de `LoyaliZA/gelia-nv-mobile`, `main` en `a44e565`, 28 de septiembre de 2026. Es un plan de implementación, no una certificación ni cambios funcionales. Coordinar con el [plan del backend](https://github.com/LoyaliZA/gelia-nv/blob/main/PLAN_PUBLICACION_PLAY_BACKEND.md).

## Estado actual

- `android/variables.gradle` apunta a API 36; el Manifest declara `INTERNET` y `ACCESS_NETWORK_STATE`, pero `android:allowBackup="true"`. Verificar de nuevo el SDK requerido justo al cargar el AAB.
- `sessionStorage.ts` guarda la sesión completa, incluido el Bearer token, tanto en `localStorage` como en Capacitor Preferences; escrituras y borrados de Preferences se lanzan sin esperar su resultado.
- `cliente.storage.ts` guarda clientes y metadatos de sincronización en IndexedDB por `${user.id}:${scopeVersion}`. Existe `limpiarCatalogo(scopeKey)`, pero `AuthProvider.logout` y el error `401` de `/mobile/me` solo borran sesión/tema. Al cambiar scope pueden quedar registros de scopes anteriores.
- `AuthProvider` revalida `/mobile/me` al iniciar y al volver a primer plano; si falla por red conserva la sesión. Esto sostiene el modo offline, pero requiere un límite de vigencia y una política de purga para permisos retirados. El `scopeKey` separa datos en UI, **no los elimina físicamente**.

## Fase M1 — Contrato de sesión y limpieza local

**Archivos:** `src/services/storage/sessionStorage.ts`, `src/features/auth/AuthProvider.tsx`, `src/features/clientes/cliente.storage.ts`, `ClienteSyncProvider.tsx`, `cliente.sync.engine.ts`.

1. Convertir lectura, escritura y borrado de sesión en operaciones `async` esperadas. Evitar carreras en las que un `Preferences.set` tardío restaure un token después de logout. Mantener un solo dueño de la sesión y detener sincronización/solicitudes pendientes antes de purgarla; una respuesta vieja no debe volver a guardar datos.
2. Elegir un almacenamiento nativo de secreto respaldado por **Android Keystore** (plugin mantenido y revisado, o pequeño plugin propio). Guardar allí el Bearer token; dejar preferencias visuales no sensibles en Preferences. No duplicar el token en `localStorage`, logs ni estado persistente de WebView. Validar comportamiento en Android real, reinstalación, bloqueo del equipo y errores del almacén seguro. Si se conserva build web de desarrollo, usar un camino explícito y separado, sin fallback silencioso a `localStorage` en Android.
3. Migrar una vez las sesiones existentes de `gelia:mobile:session:v1` en Preferences/localStorage: leer formato anterior, escribir en almacén seguro, verificar lectura, eliminar ambas copias antiguas y marcar migración terminada. Si cualquier paso falla, limpiar el secreto parcial y solicitar nuevo login; no iniciar sync con estado ambiguo. Revisar que los datos públicos mínimos de usuario/permisos no contengan token.
4. Crear una función de purga **de todos los scopes** en `gelia-mobile` (store `clientes` y `metadata`, incluidos los antiguos), o borrar toda la base si ninguna otra función la usa. Usarla en logout voluntario, `401`, cambio de usuario y reemplazo de scope. Para pérdida de permiso o `403`, bloquear inmediatamente las consultas offline y limpiar el scope afectado. Hacer la purga idempotente y esperar su fin antes de mostrar login.
5. En logout sin conexión, purgar localmente igualmente. El backend no recibió la revocación: no afirmar lo contrario. Acordar plazo de expiración y revocación administrativa en B2; no retener el token local solo para un futuro intento de logout sin diseño específico.

**Hecho cuando:** login/password y passkey persisten una sola sesión segura; después de logout, `401`, cambio de usuario o scope, inspeccionar IndexedDB, Preferences y WebView no revela ni token ni clientes antiguos. La sincronización no repuebla una base ya purgada.

## Fase M2 — Offline, permisos y respaldo Android

**Archivos:** los de M1, `android/app/src/main/AndroidManifest.xml` y nuevos XML en `android/app/src/main/res/xml/`.

1. Definir junto al backend un máximo de tiempo de uso offline desde la **última validación autorizada**. Al vencer, impedir consultas al catálogo hasta revalidar `/mobile/me`; si llega `401/403`, purgar. Probar reloj alterado/reinicio: una hora local manipulable no debe presentarse como garantía fuerte de revocación. Explicar al usuario cuándo necesita conectarse.
2. Revisar los eventos de cambio de vendedor, cliente y permisos. `scopeVersion` puede permanecer igual si cambian asignaciones con permisos idénticos; aplicar revocaciones del feed y una reconstrucción cuando el backend indique alcance nuevo. Tras 409, borrar también scopes obsoletos, no solo el actual. Retirar datos fiscales/crédito que el backend ya no envíe al cambiar versión de serializador.
3. Excluir sesión, Keystore/archivos cifrados, WebView/IndexedDB y datos reconstruibles de **cloud backup y transferencias dispositivo a dispositivo**. Definir `android:dataExtractionRules` para Android 12+ y `android:fullBackupContent` para Android 11 y anteriores; inspeccionar el Manifest fusionado. `allowBackup=false` aislado puede no impedir toda migración entre dispositivos en algunos fabricantes. Si se excluye todo, documentar que tras cambio de equipo hace falta iniciar sesión y descargar el catálogo.
4. Verificar restauración en equipo nuevo y actualización desde la versión existente: no debe reaparecer una sesión caducada ni un catálogo ajeno. La limpieza de logout y la exclusión de backup cubren amenazas distintas.

**Hecho cuando:** el catálogo solo abre dentro de la ventana offline acordada; un cambio de alcance se refleja tras reconexión; las reglas de backup excluyen datos sensibles en ambos formatos Android y se verifican en un dispositivo/emulador.

## Fase M3 — Política de privacidad y contenido de Play

**Archivos:** `src/features/profile/PerfilView.tsx`, vista de login o pantalla Acerca de y constantes de URL.

1. Enlazar la URL pública aprobada en B1 desde la app, accesible también **antes de iniciar sesión**. Abrirla con HTTPS; comprobar que funciona fuera de la red de la empresa. Mantener el nombre de entidad/app de la ficha de Play en el texto.
2. Completar con backend la matriz para **Seguridad de los datos**. Confirmar flujos de usuario, correo, ID de cuenta, credenciales, ID de dispositivo, foto opcional y campos comerciales/fiscales; distinguir transmisión hacia el backend, almacenamiento solo local y transferencia a terceros/proveedores. Revisar uso de CapacitorHttp, passkeys, registros y cualquier SDK incorporado después de esta revisión. No tomar una tabla preliminar como declaración definitiva.
3. La app actual permite login, registro de passkey y cambio de foto, pero no muestra creación de cuenta. El backend tiene registro web por invitación: decidir si se enlaza/ofrece como creación desde la app. Si se permite crear la cuenta desde la app, habilitar solicitud de eliminación dentro de la app y por web; si no, documentar por qué se declara que no se permite crear cuentas desde la app. Confirmar con el responsable legal la conservación por obligaciones aplicables.

**Hecho cuando:** política visible a invitados y usuarios, misma URL en Play Console; formulario Data Safety completado con datos reales, y declaración de eliminación congruente con el recorrido final.

## Fase M4 — AAB firmado, passkeys y prueba de distribución

**Archivos:** `android/app/build.gradle`, `capacitor.config.ts`, `README.md`, flujo de firma fuera de Git.

1. Fijar `versionCode` incremental (`build.gradle` hoy usa `1`), `versionName` y app ID final `mx.neobash.gelianv`. Generar **Android App Bundle `.aab` firmado para release** desde Android Studio/Gradle; guardar keystore, alias y contraseñas fuera del repositorio y en custodia de la empresa. No subirlos a GitHub. Usar Play App Signing y conservar la upload key.
2. Si se usarán passkeys, comprobar en el backend `/.well-known/assetlinks.json` con el certificado **de firma de app de Play** y los orígenes WebAuthn necesarios; el certificado de upload/APK local puede ser distinto. Probar con la instalación distribuida por Play, no solo con una APK local.
3. Crear un usuario de revisión con datos ficticios desde backend. Introducir usuario, contraseña e instrucciones en la sección **Sign-in details / App access** de Play Console, nunca en GitHub. Verificar acceso sin OTP que Google no pueda recibir, VPN, aprobación manual o restricción geográfica. Indicar que passkey es opcional cuando proceda.
4. Subir a prueba interna y probar **ese mismo paquete**: login, passkey, foto, sincronización inicial e incremental, desconexión/reconexión, revocación, logout offline, cambio de permisos, actualización y restauración. Revisar errores de red/logs y Play Console antes de solicitar producción.

**Hecho cuando:** AAB firmado instala desde Play; login de revisión y funcionalidades principales funcionan; no aparecen tokens o clientes tras logout/restauración; Data Safety, política y acceso están listos para envío.

## Orden recomendado y dependencias

| Orden | Backend | Móvil | Entregable verificable |
|---|---|---|---|
| 1 | B1: datos/política | M1: sesión y purga | Matriz de datos + persistencia local corregida |
| 2 | B2: revocación/login | M2: offline y backup | Contrato `401/403/409` probado en conjunto |
| 3 | B3: alcance/campos | M3: enlace y Play | Política y declaraciones consistentes |
| 4 | B4: cuenta revisora/despliegue | M4: AAB/prueba interna | Release candidato instalado desde Play |

**Riesgo que debe aceptarse expresamente:** ningún backend puede borrar al instante un catálogo ya descargado en un teléfono desconectado. El producto debe fijar duración máxima offline y controles físicos del dispositivo acordes con la sensibilidad de los clientes.

## Referencias oficiales

- [Google Play: privacidad y datos de usuario](https://support.google.com/googleplay/android-developer/answer/10144311?hl=es)
- [Google Play: Seguridad de los datos](https://support.google.com/googleplay/android-developer/answer/10787469?hl=es)
- [Google Play: acceso para revisión](https://support.google.com/googleplay/android-developer/answer/9859455?hl=es)
- [Google Play: eliminación de cuentas](https://support.google.com/googleplay/android-developer/answer/13327111?hl=es)
- [Android: reglas de Auto Backup y transferencias](https://developer.android.com/identity/data/autobackup)
