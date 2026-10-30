# React + TypeScript + Vite

## Release Android de producción

Usar Node 24, el JDK de Android Studio y el SDK Android 36. Se conserva el
lockfile: no actualizar dependencias como parte de una publicación.

- `npm run android:prepare` instala con `npm ci`, compila producción y sincroniza
  Capacitor. Se detiene en el primer error. `refresh.ps1` hace lo mismo y abre
  Android Studio; `update.ps1` antes ejecuta `git pull --ff-only`.
- `sync.ps1` conserva su flujo interactivo de commit/push, comprueba cada paso
  y reconstruye incluso si Git ya está actualizado.
- Definir `VITE_API_BASE_URL` y, si corresponde, `VITE_GELIA_ASSETS_URL` en
  `.env.production.local` o en el entorno. Build y sincronización leen los
  mismos archivos de producción. Las URLs deben ser HTTPS sin credenciales;
  las variables `VITE_*` son públicas en el paquete y no deben contener secretos.
- Para un AAB firmado, configurar en el entorno `ANDROID_KEYSTORE` (ruta
  absoluta), `ANDROID_KEY_ALIAS` y `ANDROID_KEYSTORE_PASSWORD`. Si la clave
  tiene otra contraseña, definir también `ANDROID_KEY_PASSWORD`; de lo contrario
  se usa la del almacén. No guardar estas credenciales en Git.
- Ejecutar `npm run android:release`. Exige configuración de firma, prepara
  los recursos y ejecuta `lintRelease bundleRelease`. También se puede firmar
  desde Android Studio después de preparar los recursos.

El AAB nuevo se genera en
`android/app/build/outputs/bundle/release/app-release.aab`. Conservar junto a él
el directorio `android/app/build/outputs/mapping/release`, el commit, el lockfile
y el estado de cambios locales. Los archivos antiguos en `android/app/release`
no identifican el release nuevo. Comprobar que `androidVersionCode` de
`package.json` sea mayor que cualquier código ya subido a Play.

R8 y la reducción de recursos están habilitados solo para release mediante el
DSL heredado que usa este proyecto (`android.newDsl=false`). Capacitor aporta
reglas consumidoras para sus plugins y `SecureTokenPlugin`; no añadir reglas
globales para conservar todas las clases. Mantener las opciones de compatibilidad
de Gradle hasta verificar por separado una migración de plugins/DSL.

Antes de producción, instalar desde el canal interno de Google Play y probar:
actualización sobre la versión anterior, arranque, login, persistencia y borrado
del token, passkeys, cámara/selector de fotos, QR y subida de evidencias.
Inspeccionar el AAB para verificar firma, versión, DEX, mapas y cualquier
biblioteca nativa `.so` y su compatibilidad con páginas de 16 KB.

### Firma de Play y passkeys

En Play Console usar el certificado **App signing**, que puede diferir de la
clave de subida o de una APK local. Su SHA-256 debe figurar para
`mx.neobash.gelianv` en `https://gelianv.neobash.site/.well-known/assetlinks.json`,
con la relación de credenciales correspondiente; el backend debe aceptar su
origen `android:apk-key-hash:...` en `WEBAUTHN_ANDROID_APK_KEY_HASHES`.
Verificar además que el RP ID coincida con el dominio configurado.
El script de huellas ya no elige el certificado debug por defecto. Su salida
describe el keystore indicado, no demuestra qué certificado utiliza Play.
No cambiar el dominio de producción sin coordinar la asociación y el backend.

## Passkeys / huella en Android (APK)

La APK usa `@capgo/capacitor-passkey` para enlazar WebAuthn con el lector de huella vía Credential Manager. El dominio de confianza debe ser el mismo que en el API (`gelianv.neobash.site`).

1. Tras login con contraseña: **Perfil → Preferencias → Registrar huella en este dispositivo**.
2. Cerrar sesión y en login usar **Entrar con huella** (mismo usuario).

Requisitos en servidor (repo `gelianv`):

- `https://gelianv.neobash.site/.well-known/assetlinks.json` con el package `mx.neobash.gelianv` y el SHA-256 del certificado de firma.
- `WEBAUTHN_ANDROID_APK_KEY_HASHES` en `.env` con el origen `android:apk-key-hash:...` (ver script abajo).

Huella del certificado de la APK que firmas:

```bash
npm run android:signing-fingerprint
# o: bash scripts/android-signing-fingerprint.sh /ruta/release.keystore alias contraseña
```

Generar APK nativa (Node 22+ para Capacitor CLI):

```bash
npm run build
npx cap sync android
```

## Sincronización móvil de clientes

Al iniciar una sesión, la app descarga en segundo plano el catálogo autorizado mediante el flujo de snapshots de GELIANV:

1. `POST /mobile/sync/bootstrap`
2. `GET /mobile/sync/bootstrap` en páginas de hasta 100 clientes
3. `POST /mobile/sync/bootstrap/complete`
4. `GET /mobile/sync/changes` para aplicar cambios incrementales

Los clientes se guardan en IndexedDB, separados por usuario y `scope_version`. La sincronización se reanuda sola si se corta la red, vence un timeout o GELIA responde 429 (`Retry-After`): el catálogo parcial se conserva y el bootstrap continúa desde el último `cliente_id`. Con la app visible, además se consultan cambios cada 5 minutos. El botón manual sigue limitado a 2 usos por minuto y un bloqueo de 5 minutos.

Los clientes nuevos (carga masiva o alta) llegan por `GET /mobile/sync/changes`. Si ese feed no alcanza el `authorized_total` del API, la app hace un bootstrap de reconciliación una sola vez por total. Los conflictos `scope_changed`, `cursor_expired`, `snapshot_expired` y `bootstrap_mismatch` reinician automáticamente el catálogo del alcance actual.

La consulta separa número y nombre. El número usa teclado numérico y acepta desde un dígito. El nombre pide al menos 2 caracteres.

Las búsquedas por número consultan primero IndexedDB y, si no hay coincidencia local, llaman a `GET /mobile/clientes/{numero_cliente}` cuando hay conexión (incluso si el catálogo aún no se descargó). La búsqueda por nombre usa `GET /mobile/clientes?q=` con paginación de 10 resultados por página; sin conexión, la búsqueda por nombre recurre al catálogo local si está disponible.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
