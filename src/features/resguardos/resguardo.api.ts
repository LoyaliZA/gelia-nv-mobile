import { apiFormRequest, apiRequest } from '../../lib/api/apiClient'
import { createIdempotencyKey } from '../../utils/idempotency'
import type { MobileSession } from '../auth/auth.types'
import type {
  AltaResguardoInput,
  ConfirmarCustodiaInput,
  ProductoResguardo,
  ResguardoBandeja,
  ResguardoCustodiaFormResponse,
  ResguardoDetalleResponse,
  ResguardoEntregaInput,
  ResguardoListResponse,
  ResguardoPaso,
} from './resguardo.types'

interface ListFilters {
  bandeja: ResguardoBandeja
  paso?: ResguardoPaso
  q?: string
  antiguedad?: string
  page?: number
  perPage?: number
}

function auth(session: MobileSession) {
  return { token: session.accessToken }
}

export function listarResguardos(session: MobileSession, filters: ListFilters) {
  const query = new URLSearchParams()
  query.set('bandeja', filters.bandeja)
  query.set('page', String(filters.page ?? 1))
  query.set('per_page', String(filters.perPage ?? 15))

  if (filters.bandeja === 'por_recibir' && filters.paso) {
    query.set('paso', filters.paso)
  }
  if (filters.q?.trim()) query.set('q', filters.q.trim())
  if (filters.antiguedad) query.set('antiguedad', filters.antiguedad)

  return apiRequest<ResguardoListResponse>(
    `/mobile/punto-venta/resguardos?${query.toString()}`,
    auth(session),
  )
}

export function obtenerDetalleResguardo(session: MobileSession, id: number) {
  return apiRequest<ResguardoDetalleResponse>(
    `/mobile/punto-venta/resguardos/${id}`,
    auth(session),
  )
}

export function confirmarRecepcionResguardo(
  session: MobileSession,
  id: number,
  version: number,
) {
  return apiRequest<{ resguardo: { id: number; version: number; estado: string; estado_etiqueta: string } }>(
    `/mobile/punto-venta/resguardos/${id}/recepcion`,
    {
      method: 'PUT',
      body: {
        version,
        idempotency_key: createIdempotencyKey('pdv:movil:rec', id),
      },
      ...auth(session),
    },
  )
}

export function pasarResguardoARecepcion(
  session: MobileSession,
  id: number,
  version: number,
) {
  return apiRequest<{ resguardo: { id: number; version: number; estado: string; estado_etiqueta: string } }>(
    `/mobile/punto-venta/resguardos/${id}/pasar-recepcion`,
    {
      method: 'PUT',
      body: {
        version,
        idempotency_key: createIdempotencyKey('pdv:movil:paso', id),
      },
      ...auth(session),
    },
  )
}

export function obtenerFormularioCustodiaResguardo(session: MobileSession, id: number) {
  return apiRequest<ResguardoCustodiaFormResponse>(
    `/mobile/punto-venta/resguardos/${id}/custodia`,
    auth(session),
  )
}

export function confirmarCustodiaResguardo(
  session: MobileSession,
  id: number,
  version: number,
  input: ConfirmarCustodiaInput,
) {
  const form = new FormData()
  form.append('version', String(version))
  form.append('idempotency_key', createIdempotencyKey('pdv:movil:custodia', id))
  form.append('almacen_id', String(input.almacenId))
  input.bultos.forEach((bulto, indice) => {
    form.append(`bultos[${indice}][folio]`, bulto.folio.trim())
    form.append(`bultos[${indice}][tipo]`, bulto.tipo)
    form.append(`bultos[${indice}][condicion]`, bulto.condicion)
    form.append(`bultos[${indice}][piezas]`, String(bulto.piezas))
  })
  input.evidencias?.forEach((archivo, indice) => {
    form.append(`evidencias[${indice}]`, archivo, archivo.name)
  })

  return apiFormRequest<{
    resguardo: { id: number; version: number; estado: string; estado_etiqueta: string }
  }>(
    `/mobile/punto-venta/resguardos/${id}/custodia`,
    form,
    { method: 'PUT', token: session.accessToken },
  )
}

export function buscarProductosResguardo(session: MobileSession, termino: string) {
  const query = new URLSearchParams({ q: termino.trim() })
  return apiRequest<{ data: ProductoResguardo[] }>(
    `/mobile/punto-venta/resguardos/productos/buscar?${query.toString()}`,
    auth(session),
  )
}

export function registrarResguardoManual(session: MobileSession, input: AltaResguardoInput) {
  const form = new FormData()
  form.append('idempotency_key', createIdempotencyKey('pdv:movil:alta'))
  form.append('cliente_id', String(input.clienteId))
  form.append('folio', input.folio.trim())
  form.append('origen_id', String(input.origenId))
  form.append('cantidad_bultos_esperada', String(input.cantidadBultos))
  form.append('envia_a_otra_persona', input.enviaAOtraPersona ? '1' : '0')
  form.append('archivo_ticket', input.archivoTicket, input.archivoTicket.name)
  form.append('foto_paquete', input.fotoPaquete, input.fotoPaquete.name)

  if (input.enviaAOtraPersona && input.enviaOtraPersona?.trim()) {
    form.append('envia_otra_persona', input.enviaOtraPersona.trim())
  }
  if (input.observaciones?.trim()) {
    form.append('observaciones', input.observaciones.trim())
  }
  input.piezas.forEach((pieza, index) => {
    form.append(`piezas[${index}][producto_id]`, String(pieza.productoId))
    form.append(`piezas[${index}][cantidad]`, String(pieza.cantidad))
  })

  return apiFormRequest<{
    resguardo: { id: number; estado: string; estado_etiqueta: string; version: number }
  }>(
    '/mobile/punto-venta/resguardos',
    form,
    { method: 'POST', token: session.accessToken },
  )
}

export function entregarResguardo(
  session: MobileSession,
  id: number,
  version: number,
  input: ResguardoEntregaInput,
) {
  const form = new FormData()
  form.append('version', String(version))
  form.append('idempotency_key', createIdempotencyKey('pdv:movil:ent', id))
  form.append('relacion', input.relacion)
  form.append('nombre_quien_retira', input.nombreQuienRetira.trim())
  form.append('metodo_validacion', 'firma')
  form.append('firma', input.firma, 'firma.png')
  form.append('evidencias[0]', input.fotoPaqueteAbierto, input.fotoPaqueteAbierto.name || 'paquete-abierto.webp')

  if (input.observaciones?.trim()) {
    form.append('observaciones', input.observaciones.trim())
  }
  input.bultoIds?.forEach((bultoId) => form.append('bulto_ids[]', String(bultoId)))

  return apiFormRequest<{
    resguardo: { id: number; version: number; estado: string; estado_etiqueta: string }
    entrega: { id: number; relacion: string; nombre_quien_retira: string } | null
  }>(
    `/mobile/punto-venta/resguardos/${id}/entrega`,
    form,
    {
      method: 'PUT',
      token: session.accessToken,
    },
  )
}
