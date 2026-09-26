import { ApiError } from '../../lib/api/apiClient'
import { hasAnyPermission } from '../../utils/can'

/** Misma regla que `MobileClienteAlcanceService::tieneAccesoMovil` en GELIA-NV. */
export const MOBILE_CLIENTE_PERMISSIONS = ['clientes.ver', 'mis_clientes.gestionar'] as const

export const MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE =
  'Tu cuenta no tiene permiso para consultar clientes en móvil. Se requiere acceso a la base de clientes o a mis clientes.'

export function puedeConsultarClientesMovil(permissions: string[]): boolean {
  return hasAnyPermission(permissions, [...MOBILE_CLIENTE_PERMISSIONS])
}

export function mensajeErrorAccesoClientes(error: unknown): string | null {
  if (error instanceof ApiError && error.status === 403) {
    const payload = error.details
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = (payload as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) {
        return `${MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE} (${message.trim()})`
      }
    }
    return MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE
  }
  return null
}

export function esErrorAccesoClientes(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403
}
