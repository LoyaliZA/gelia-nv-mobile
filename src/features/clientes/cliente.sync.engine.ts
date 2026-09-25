import { ApiError } from '../../lib/api/apiClient'
import type { MobileSession } from '../auth/auth.types'
import {
  completarBootstrap,
  descargarCambios,
  descargarPaginaBootstrap,
  iniciarBootstrap,
  requiereNuevoBootstrap,
} from './cliente.api'
import {
  contarClientesPorScope,
  eliminarClientePorId,
  guardarClientes,
  guardarSyncMetadata,
  leerSyncMetadata,
  limpiarCatalogo,
} from './cliente.storage'
import type { ClienteSyncMetadata } from './cliente.storage'
import type { ClienteSyncState } from './cliente.types'

const BOOTSTRAP_PAGE_DELAY_MS = 250
const PERIODIC_SYNC_MS = 5 * 60_000
const BACKOFF_STEPS_MS = [5_000, 15_000, 30_000, 60_000, 300_000]

const initialState: ClienteSyncState = {
  phase: 'idle',
  downloaded: 0,
  total: null,
  lastSyncedAt: null,
  error: null,
  retryAt: null,
}

class SyncCancelled extends Error {
  constructor() {
    super('Sincronización cancelada.')
    this.name = 'SyncCancelled'
  }
}

let tail: Promise<void> = Promise.resolve()

function enqueue(task: () => Promise<void>): Promise<void> {
  const run = tail.then(task, task)
  tail = run.then(() => undefined, () => undefined)
  return run
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'No fue posible sincronizar los clientes.'
}

function isTransient(error: unknown) {
  if (requiereNuevoBootstrap(error)) return false
  if (!(error instanceof ApiError)) return false
  return error.status === 0 || [408, 429, 502, 503, 504].includes(error.status)
}

function isPermanent(error: unknown) {
  if (!(error instanceof ApiError) || requiereNuevoBootstrap(error)) return false
  return error.status === 401 || error.status === 403 || error.status === 404 || error.status === 422
}

function retryDelay(error: unknown, attempt: number) {
  if (error instanceof ApiError && error.status === 429 && error.retryAfterSeconds !== null) {
    return Math.min(Math.max(error.retryAfterSeconds * 1_000, BACKOFF_STEPS_MS[0]), BACKOFF_STEPS_MS[BACKOFF_STEPS_MS.length - 1])
  }
  return BACKOFF_STEPS_MS[Math.min(attempt, BACKOFF_STEPS_MS.length - 1)]
}

interface EngineOptions {
  scopeKey: string
  getSession: () => MobileSession
  onState: (state: ClienteSyncState) => void
  onOnlineChange: (online: boolean) => void
}

export interface ClienteSyncEngine {
  requestSync: () => Promise<void>
  start: () => void
  stop: () => void
  handleOnline: () => void
  handleOffline: () => void
}

export function createClienteSyncEngine(options: EngineOptions): ClienteSyncEngine {
  let stopped = false
  let running: Promise<void> | null = null
  let queued = false
  let backoffIndex = 0
  let retryTimer: number | null = null
  let periodicTimer: number | null = null
  let state = initialState

  const publish = (partial: Partial<ClienteSyncState>) => {
    state = { ...state, ...partial }
    if (!stopped) options.onState(state)
  }

  const ensureActive = () => {
    if (stopped) throw new SyncCancelled()
  }

  const clearRetry = () => {
    if (retryTimer !== null) window.clearTimeout(retryTimer)
    retryTimer = null
  }

  const scheduleRetry = (error: unknown) => {
    const delay = retryDelay(error, backoffIndex)
    backoffIndex += 1
    const retryAt = Date.now() + delay
    publish({
      phase: navigator.onLine ? 'retrying' : 'offline',
      error: navigator.onLine ? null : 'La sincronización continuará al recuperar conexión.',
      retryAt,
    })
    clearRetry()
    retryTimer = window.setTimeout(() => {
      retryTimer = null
      void requestSync()
    }, delay)
  }

  const withCount = async (metadata: ClienteSyncMetadata): Promise<ClienteSyncMetadata> => {
    const downloaded = await contarClientesPorScope(options.scopeKey)
    const next = { ...metadata, downloaded }
    await guardarSyncMetadata(next)
    return next
  }

  const bootstrap = async (existing?: ClienteSyncMetadata | null): Promise<ClienteSyncMetadata> => {
    ensureActive()
    let metadata = existing ?? null
    if (!metadata?.snapshotId || metadata.complete) {
      await limpiarCatalogo(options.scopeKey)
      const started = await iniciarBootstrap(options.getSession())
      ensureActive()
      metadata = {
        scopeKey: options.scopeKey,
        snapshotId: started.snapshotId,
        downloaded: 0,
        total: started.total,
        maxClienteId: 0,
        cursor: null,
        complete: false,
        lastSyncedAt: null,
        lastReconciledTotal: null,
      }
      await guardarSyncMetadata(metadata)
    }

    publish({
      phase: 'bootstrapping',
      downloaded: metadata.downloaded,
      total: metadata.total,
      lastSyncedAt: metadata.lastSyncedAt,
      error: null,
      retryAt: null,
    })

    const snapshotId = metadata.snapshotId
    if (!snapshotId) throw new Error('No hay un snapshot activo para continuar la sincronización.')
    let hasMore = true
    while (hasMore) {
      ensureActive()
      const page = await descargarPaginaBootstrap(options.getSession(), snapshotId, metadata.maxClienteId)
      ensureActive()
      await guardarClientes(options.scopeKey, page.clientes)
      metadata = {
        ...metadata,
        downloaded: metadata.downloaded + page.clientes.length,
        maxClienteId: page.maxClienteId,
        total: page.total ?? metadata.total,
        lastReconciledTotal: metadata.lastReconciledTotal ?? null,
      }
      await guardarSyncMetadata(metadata)
      publish({ downloaded: metadata.downloaded, total: metadata.total, retryAt: null })
      hasMore = page.hasMore
      if (hasMore && page.clientes.length === 0) {
        throw new Error('GELIA devolvió una página vacía durante la sincronización.')
      }
      if (hasMore) await sleep(BOOTSTRAP_PAGE_DELAY_MS)
    }

    ensureActive()
    const cursor = await completarBootstrap(
      options.getSession(),
      snapshotId,
      metadata.downloaded,
      metadata.maxClienteId,
    )
    const completed = await withCount({
      ...metadata,
      snapshotId: null,
      cursor,
      complete: true,
      lastSyncedAt: new Date().toISOString(),
      lastReconciledTotal: metadata.lastReconciledTotal ?? null,
    })
    publish({ downloaded: completed.downloaded, total: completed.total, lastSyncedAt: completed.lastSyncedAt })
    return completed
  }

  const incremental = async (metadata: ClienteSyncMetadata) => {
    ensureActive()
    let current: ClienteSyncMetadata = { ...metadata, lastReconciledTotal: metadata.lastReconciledTotal ?? null }
    let hasMore = true
    let authorizedTotal: number | null = null
    publish({
      phase: 'incremental',
      downloaded: current.downloaded,
      total: current.total,
      lastSyncedAt: current.lastSyncedAt,
      error: null,
      retryAt: null,
    })

    while (hasMore) {
      ensureActive()
      const previousCursor = current.cursor ?? 0
      const page = await descargarCambios(options.getSession(), previousCursor)
      ensureActive()
      authorizedTotal = page.authorizedTotal ?? authorizedTotal
      for (const event of page.events) {
        if ((event.operation === 'granted' || event.operation === 'updated') && event.data) {
          await guardarClientes(options.scopeKey, [event.data])
        } else if (event.operation === 'deleted' || event.operation === 'revoked') {
          await eliminarClientePorId(options.scopeKey, Number(event.aggregate_id))
        }
      }
      current = {
        ...current,
        cursor: page.cursor,
        lastSyncedAt: new Date().toISOString(),
      }
      await guardarSyncMetadata(current)
      hasMore = page.hasMore && page.cursor !== previousCursor
      if (hasMore && page.events.length === 0 && page.cursor === previousCursor) break
    }

    current = await withCount(current)
    publish({ downloaded: current.downloaded, lastSyncedAt: current.lastSyncedAt, retryAt: null })
    return { metadata: current, authorizedTotal }
  }

  const reconcile = async (metadata: ClienteSyncMetadata, authorizedTotal: number | null, driftAttempted: boolean) => {
    if (driftAttempted || authorizedTotal === null) return { metadata, driftAttempted }
    if (metadata.downloaded === authorizedTotal) return { metadata, driftAttempted }
    if (metadata.lastReconciledTotal === authorizedTotal) return { metadata, driftAttempted }

    await guardarSyncMetadata({ ...metadata, lastReconciledTotal: authorizedTotal })
    await limpiarCatalogo(options.scopeKey)
    const rebuilt = await bootstrap(null)
    const refreshed = await incremental(rebuilt)
    const settled = await withCount({
      ...refreshed.metadata,
      lastReconciledTotal: authorizedTotal,
    })
    return { metadata: settled, driftAttempted: true }
  }

  const recover = async (error: unknown) => {
    if (!requiereNuevoBootstrap(error)) return false
    await limpiarCatalogo(options.scopeKey)
    const metadata = await bootstrap(null)
    const refreshed = await incremental(metadata)
    publish({
      phase: 'ready',
      downloaded: refreshed.metadata.downloaded,
      total: refreshed.metadata.total,
      lastSyncedAt: refreshed.metadata.lastSyncedAt,
      error: null,
      retryAt: null,
    })
    options.onOnlineChange(true)
    backoffIndex = 0
    return true
  }

  const runSyncBody = async () => {
    clearRetry()
    if (!navigator.onLine) {
      options.onOnlineChange(false)
      publish({
        phase: 'offline',
        error: 'La sincronización continuará al recuperar conexión.',
        retryAt: null,
      })
      scheduleRetry(new ApiError('Sin conexión.', 0))
      return
    }

    try {
      let metadata = await leerSyncMetadata(options.scopeKey)
      if (metadata) metadata = { ...metadata, lastReconciledTotal: metadata.lastReconciledTotal ?? null }
      let driftAttempted = false
      if (metadata?.complete) {
        const refreshed = await incremental(metadata)
        const reconciled = await reconcile(refreshed.metadata, refreshed.authorizedTotal, driftAttempted)
        metadata = reconciled.metadata
        driftAttempted = reconciled.driftAttempted
      } else {
        metadata = await bootstrap(metadata)
        const refreshed = await incremental(metadata)
        const reconciled = await reconcile(refreshed.metadata, refreshed.authorizedTotal, driftAttempted)
        metadata = reconciled.metadata
      }
      options.onOnlineChange(true)
      backoffIndex = 0
      publish({
        phase: 'ready',
        downloaded: metadata.downloaded,
        total: metadata.total,
        lastSyncedAt: metadata.lastSyncedAt,
        error: null,
        retryAt: null,
      })
    } catch (error) {
      if (error instanceof SyncCancelled || stopped) return
      try {
        if (await recover(error)) return
      } catch (retryError) {
        if (retryError instanceof SyncCancelled || stopped) return
        if (!isPermanent(retryError) && isTransient(retryError)) {
          options.onOnlineChange(retryError instanceof ApiError && retryError.status === 0 ? false : navigator.onLine)
          scheduleRetry(retryError)
          return
        }
        publish({
          phase: 'error',
          error: errorMessage(retryError),
          retryAt: null,
        })
        return
      }

      if (!isPermanent(error) && isTransient(error)) {
        const offline = error instanceof ApiError && error.status === 0
        options.onOnlineChange(offline ? false : navigator.onLine)
        scheduleRetry(error)
        return
      }

      publish({
        phase: 'error',
        error: errorMessage(error),
        retryAt: null,
      })
    }
  }

  const requestSync = () => {
    if (stopped) return Promise.resolve()
    if (running) {
      queued = true
      return running
    }
    running = enqueue(async () => {
      if (stopped) return
      await runSyncBody()
    }).finally(() => {
      running = null
      if (queued && !stopped) {
        queued = false
        void requestSync()
      }
    })
    return running
  }

  return {
    requestSync,
    start: () => {
      void requestSync()
      periodicTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) void requestSync()
      }, PERIODIC_SYNC_MS)
    },
    stop: () => {
      stopped = true
      clearRetry()
      if (periodicTimer !== null) window.clearInterval(periodicTimer)
      periodicTimer = null
    },
    handleOnline: () => {
      options.onOnlineChange(true)
      backoffIndex = 0
      clearRetry()
      void requestSync()
    },
    handleOffline: () => {
      options.onOnlineChange(false)
      publish({
        phase: 'offline',
        error: 'La sincronización continuará al recuperar conexión.',
        retryAt: state.retryAt,
      })
    },
  }
}
