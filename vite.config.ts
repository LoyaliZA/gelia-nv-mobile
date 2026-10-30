import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

const packageJson = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf8'),
) as { version: string }

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const apiUrl = env.VITE_API_BASE_URL?.trim()
    if (!apiUrl) throw new Error('Falta VITE_API_BASE_URL para compilar la aplicación.')
    for (const [name, value] of Object.entries({
      VITE_API_BASE_URL: apiUrl,
      VITE_GELIA_ASSETS_URL: env.VITE_GELIA_ASSETS_URL?.trim() || 'https://gelianv.neobash.site',
    })) {
      const url = new URL(value)
      if (url.protocol !== 'https:' || url.username || url.password) {
        throw new Error(`${name} debe ser una URL HTTPS sin credenciales.`)
      }
    }
  }
  return {
    plugins: [react()],
    build: { minify: 'oxc', sourcemap: false },
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
    },
  }
})
