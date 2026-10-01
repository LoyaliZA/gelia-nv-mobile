import { ApiError } from '../../lib/api/apiClient'

export function mensajeErrorPdv(
  error: unknown,
  fallback = 'GELIA no pudo completar la operación.',
) {
  if (!(error instanceof ApiError)) return fallback

  if (error.details && typeof error.details === 'object') {
    const details = error.details as Record<string, unknown>
    const message = details.message
    if (typeof message === 'string' && message.trim()) return message.trim()

    const errors = details.errors
    if (errors && typeof errors === 'object') {
      for (const value of Object.values(errors as Record<string, unknown>)) {
        if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
        if (typeof value === 'string') return value
      }
    }

    const code = details.code
    if (code === 'sucursal_activa_requerida') {
      return 'Selecciona una sucursal activa antes de continuar.'
    }
  }

  if (error.status === 401) return 'La sesión móvil expiró o fue revocada.'
  if (error.status === 403) return 'Tu usuario no tiene permiso para esta operación.'
  if (error.status === 404) return 'El registro ya no está disponible en esta sucursal.'
  if (error.status === 409) return 'El registro cambió en otro terminal. Actualiza e intenta nuevamente.'
  if (error.status === 422) return 'Revisa los datos capturados.'
  if (error.status === 429) return 'Hay demasiadas solicitudes. Espera unos segundos e intenta de nuevo.'
  if (error.status === 0) return 'No fue posible conectar con GELIA. Revisa tu conexión.'

  return error.message || fallback
}
