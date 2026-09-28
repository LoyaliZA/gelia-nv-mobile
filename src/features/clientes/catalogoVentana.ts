export const OFFLINE_CATALOG_WINDOW_MS = 24 * 60 * 60 * 1000

export const MENSAJE_CATALOGO_REQUIERE_CONEXION =
  'Hace falta conexión para validar el acceso al catálogo. Los datos de este dispositivo no se consultan hasta revalidar.'

export type CatalogoVentana =
  | { allowed: true }
  | { allowed: false; reason: 'missing' | 'expired' | 'clock' }

export function evaluarVentanaCatalogo(authorizedAt: string, now = Date.now()): CatalogoVentana {
  if (!authorizedAt) return { allowed: false, reason: 'missing' }
  const at = Date.parse(authorizedAt)
  if (!Number.isFinite(at)) return { allowed: false, reason: 'missing' }
  const delta = now - at
  if (delta < 0) return { allowed: false, reason: 'clock' }
  if (delta > OFFLINE_CATALOG_WINDOW_MS) return { allowed: false, reason: 'expired' }
  return { allowed: true }
}
