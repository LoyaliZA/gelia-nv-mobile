import { apiRequest } from '../../lib/api/apiClient'
import { createIdempotencyKey } from '../../utils/idempotency'
import type { MobileSession } from '../auth/auth.types'
import type { AltaTurnoInput, TurnosRecepcionResponse } from './turno.types'

function auth(session: MobileSession) {
  return { token: session.accessToken }
}

export function obtenerRecepcionTurnos(session: MobileSession) {
  return apiRequest<TurnosRecepcionResponse>(
    '/mobile/punto-venta/turnos/recepcion',
    auth(session),
  )
}

export function registrarTurno(session: MobileSession, input: AltaTurnoInput) {
  return apiRequest<{
    turno: {
      id: number
      folio: string
      estado: string
      sucursal_id: number
      cliente_id: number | null
      snapshot_nombre_llamado: string
      version: number
    }
  }>('/mobile/punto-venta/turnos', {
    method: 'POST',
    body: {
      idempotency_key: createIdempotencyKey('pdv:movil:turno'),
      ...(input.clienteId ? { cliente_id: input.clienteId } : {}),
      ...(input.nombreLlamado?.trim() ? { nombre_llamado: input.nombreLlamado.trim() } : {}),
      prioridad_adulto_mayor: Boolean(input.prioridadAdultoMayor),
      prioridad_discapacidad: Boolean(input.prioridadDiscapacidad),
    },
    ...auth(session),
  })
}
