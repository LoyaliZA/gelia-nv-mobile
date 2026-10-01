import { apiRequest } from '../../lib/api/apiClient'
import type { MobileSession } from '../auth/auth.types'
import type { PuntoVentaContexto } from './puntoVenta.types'

function auth(session: MobileSession) {
  return { token: session.accessToken }
}

export function obtenerContextoPuntoVenta(session: MobileSession) {
  return apiRequest<PuntoVentaContexto>('/mobile/punto-venta/contexto', auth(session))
}

export function establecerSucursalActivaPuntoVenta(
  session: MobileSession,
  sucursalId: number,
) {
  return apiRequest<PuntoVentaContexto>('/mobile/punto-venta/sucursal-activa', {
    method: 'PUT',
    body: { sucursal_id: sucursalId },
    ...auth(session),
  })
}
