/** Origen de GELIA-NV para assets estáticos y archivos en /storage. */
export function geliaOrigin(): string {
  const configured = import.meta.env.VITE_GELIA_ASSETS_URL?.trim().replace(/\/$/, '')
  if (configured) return configured

  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '')
  if (!apiBase) return ''
  return apiBase.replace(/\/api\/v1$/i, '')
}

export function resolveGeliaAssetUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path

  const origin = geliaOrigin()
  if (!origin) return path

  return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`
}
