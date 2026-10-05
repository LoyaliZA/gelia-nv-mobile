import { apiRequest } from '../../lib/api/apiClient'
import { createIdempotencyKey } from '../../utils/idempotency'
import type { MobileSession } from '../auth/auth.types'
import type { VisitasDelDiaResponse } from './visita.types'

function auth(session: MobileSession) {
  return { token: session.accessToken }
}

export function obtenerVisitasDelDia(session: MobileSession) {
  return apiRequest<VisitasDelDiaResponse>(
    '/mobile/punto-venta/visitas-programadas',
    auth(session),
  )
}

export function confirmarLlegadaVisita(session: MobileSession, visitaId: number) {
  return apiRequest<{ message: string }>(
    `/mobile/punto-venta/visitas-programadas/${visitaId}/llegada`,
    {
      method: 'POST',
      body: {
        idempotency_key: createIdempotencyKey(`pdv:movil:visita-llegada:${visitaId}`),
      },
      ...auth(session),
    },
  )
}
