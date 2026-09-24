import type { GeliaUser } from '../features/auth/auth.types'

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

export function resolveProfilePhotoUrl(user: Pick<GeliaUser, 'foto_perfil' | 'foto_perfil_url'>): string | null {
  if (user.foto_perfil_url) return resolveGeliaAssetUrl(user.foto_perfil_url)
  if (user.foto_perfil) return resolveGeliaAssetUrl(`/storage/${user.foto_perfil}`)
  return null
}
