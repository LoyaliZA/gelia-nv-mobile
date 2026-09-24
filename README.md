# React + TypeScript + Vite

## Sincronización móvil de clientes

Al iniciar una sesión, la app descarga en segundo plano el catálogo autorizado mediante el flujo de snapshots de GELIANV:

1. `POST /mobile/sync/bootstrap`
2. `GET /mobile/sync/bootstrap` en páginas de hasta 100 clientes
3. `POST /mobile/sync/bootstrap/complete`
4. `GET /mobile/sync/changes` para aplicar cambios incrementales

Los clientes se guardan en IndexedDB, separados por usuario y `scope_version`. La sincronización se reanuda cuando vuelve la conexión o la app regresa al primer plano. Los conflictos `scope_changed`, `cursor_expired`, `snapshot_expired` y `bootstrap_mismatch` reinician automáticamente el catálogo del alcance actual.

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
