import { ApiError, API_CONNECT_TIMEOUT_MS, API_MAX_RETRIES, API_READ_TIMEOUT_MS, apiRequest } from '../../lib/api/apiClient'
import type { MobileSession } from '../auth/auth.types'
import type { ClienteMovil } from './cliente.types'

export interface BootstrapState {
  snapshotId: string
  total: number
}

export interface BootstrapPage {
  clientes: ClienteMovil[]
  hasMore: boolean
  maxClienteId: number
}

export interface ClienteChange {
  seq: number
  operation: 'granted' | 'updated' | 'deleted' | 'revoked'
  aggregate_id: number
  data?: ClienteMovil | null
}

export interface ChangesPage {
  events: ClienteChange[]
  cursor: number
  hasMore: boolean
}

export interface ClienteSearchMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface ClienteSearchPage {
  data: ClienteMovil[]
  meta: ClienteSearchMeta
}

function auth(session: MobileSession) {
  return { token: session.accessToken, scopeVersion: session.scopeVersion }
}

const syncRequestOptions = {
  connectTimeoutMs: API_CONNECT_TIMEOUT_MS,
  readTimeoutMs: API_READ_TIMEOUT_MS,
  retries: API_MAX_RETRIES,
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function list<T>(payload: Record<string, unknown>, keys: string[]): T[] {
  for (const key of keys) if (Array.isArray(payload[key])) return payload[key] as T[]
  return []
}

function numberValue(payload: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = Number(payload[key])
    if (Number.isFinite(value)) return value
  }
  return fallback
}

export async function iniciarBootstrap(session: MobileSession): Promise<BootstrapState> {
  const payload = record(await apiRequest<unknown>('/mobile/sync/bootstrap', {
    method: 'POST',
    ...auth(session),
    ...syncRequestOptions,
  }))
  const snapshotId = String(payload.snapshot_id ?? '')
  if (!snapshotId) throw new ApiError('GELIA no devolvió un snapshot válido.', 500, payload)
  return { snapshotId, total: numberValue(payload, ['total_items', 'total']) }
}

export async function descargarPaginaBootstrap(
  session: MobileSession,
  snapshotId: string,
  afterClienteId: number,
): Promise<BootstrapPage> {
  const query = new URLSearchParams({
    snapshot_id: snapshotId,
    after_cliente_id: String(afterClienteId),
    limit: '100',
  })
  const payload = record(await apiRequest<unknown>(`/mobile/sync/bootstrap?${query}`, {
    ...auth(session),
    ...syncRequestOptions,
  }))
  const clientes = list<ClienteMovil>(payload, ['clientes', 'data', 'items'])
  const maxFromItems = clientes.reduce((max, cliente) => Math.max(max, Number(cliente.id) || 0), afterClienteId)
  return {
    clientes,
    hasMore: Boolean(payload.has_more),
    maxClienteId: numberValue(payload, ['max_cliente_id', 'next_after_cliente_id'], maxFromItems),
  }
}

export async function completarBootstrap(
  session: MobileSession,
  snapshotId: string,
  itemsCount: number,
  maxClienteId: number,
) {
  const payload = record(await apiRequest<unknown>('/mobile/sync/bootstrap/complete', {
    method: 'POST',
    body: { snapshot_id: snapshotId, items_count: itemsCount, max_cliente_id: maxClienteId },
    ...auth(session),
    ...syncRequestOptions,
  }))
  return numberValue(payload, ['cursor', 'next_cursor', 'max_seq'])
}

export async function descargarCambios(session: MobileSession, cursor: number): Promise<ChangesPage> {
  const query = new URLSearchParams({ cursor: String(cursor), limit: '200' })
  const payload = record(await apiRequest<unknown>(`/mobile/sync/changes?${query}`, {
    ...auth(session),
    ...syncRequestOptions,
  }))
  const events = list<ClienteChange>(payload, ['events', 'changes', 'data', 'items'])
  const lastSeq = events.reduce((max, event) => Math.max(max, Number(event.seq) || 0), cursor)
  return {
    events,
    cursor: numberValue(payload, ['cursor', 'next_cursor', 'max_seq'], lastSeq),
    hasMore: Boolean(payload.has_more),
  }
}

export async function buscarClienteRemoto(session: MobileSession, numeroCliente: string) {
  const payload = record(await apiRequest<unknown>(`/mobile/clientes/${encodeURIComponent(numeroCliente)}`, auth(session)))
  const cliente = record(payload.data ?? payload.cliente ?? payload)
  return cliente as unknown as ClienteMovil
}

export async function buscarClientesRemoto(
  session: MobileSession,
  { q, page = 1, perPage = 10 }: { q: string; page?: number; perPage?: number },
): Promise<ClienteSearchPage> {
  const query = new URLSearchParams({
    q,
    page: String(page),
    per_page: String(perPage),
  })
  const payload = record(await apiRequest<unknown>(`/mobile/clientes?${query}`, auth(session)))
  const data = list<ClienteMovil>(payload, ['data', 'clientes', 'items'])
  const meta = record(payload.meta ?? {})
  return {
    data,
    meta: {
      current_page: numberValue(meta, ['current_page'], page),
      last_page: numberValue(meta, ['last_page'], 1),
      per_page: numberValue(meta, ['per_page'], perPage),
      total: numberValue(meta, ['total'], data.length),
    },
  }
}

export function requiereNuevoBootstrap(error: unknown) {
  if (!(error instanceof ApiError) || ![409, 410, 422].includes(error.status)) return false
  const details = record(error.details)
  const code = String(details.code ?? details.error ?? '')
  return ['scope_changed', 'cursor_expired', 'snapshot_expired', 'snapshot_not_ready', 'bootstrap_mismatch'].includes(code)
}
