import { ApiError } from '../../lib/api/apiClient'
import type { MobileSession } from '../auth/auth.types'
import {
  completarBootstrap,
  descargarCambios,
  descargarPaginaBootstrap,
  iniciarBootstrap,
  requiereNuevoBootstrap,
} from './cliente.api'
import { mensajeCatalogoRequiereConexion } from './catalogoVentana'
import {
  contarClientesPorScope,
  eliminarClientePorId,
  guardarClientes,
  guardarSyncMetadata,
  leerSyncMetadata,
  limpiarCatalogo,
} from './cliente.storage'
import type { ClienteSyncMetadata } from './cliente.storage'
import { MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE, mensajeErrorAccesoClientes } from './mobileClienteAccess'
import type { ClienteSyncState } from './cliente.types'

const BOOTSTRAP_PAGE_DELAY_MS = 250
const PERIODIC_SYNC_MS = 5 * 60_000
const BACKOFF_STEPS_MS = [5_000, 15_000, 30_000, 60_000, 300_000]
const MENSAJE_DESFASE = 'El catálogo local no coincide con GELIA. Puedes seguir consultando o resincronizar.'
const MENSAJE_RENOVAR = 'GELIA pidió renovar el catálogo. Los clientes guardados siguen disponibles. Resincroniza si hace falta.'
const MENSAJE_INCOMPLETO = 'El catálogo local puede estar incompleto. Puedes seguir consultando o resincronizar.'

const initialState: ClienteSyncState = {
  phase: 'idle',
  downloaded: 0,
  total: null,
  lastSyncedAt: null,
  error: null,
  retryAt: null,
  requiereResincronizacion: false,
}

class SyncCancelled extends Error {
  constructor() {
    super('Sincronización cancelada.')
    this.name = 'SyncCancelled'
  }
}

let tail: Promise<void> = Promise.resolve()
const paradas = new Set<() => void>()

export function registrarParadaSync(stop: () => void) {
  paradas.add(stop)
  return () => { paradas.delete(stop) }
}

export function detenerSincronizacion() {
  for (const stop of paradas) stop()
}

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

function metadataVacia(scopeKey: string, descargaSuspendida: boolean): ClienteSyncMetadata {
  return {
    scopeKey,
    snapshotId: null,
    downloaded: 0,
    total: null,
    maxClienteId: 0,
    cursor: null,
    complete: false,
    lastSyncedAt: null,
    lastReconciledTotal: null,
    requiereResincronizacion: false,
    descargaSuspendida,
  }
}

interface EngineOptions {
  scopeKey: string
  getSession: () => MobileSession
  canSync: () => boolean
  catalogoVigente: () => boolean
  onState: (state: ClienteSyncState) => void
  onOnlineChange: (online: boolean) => void
  onSessionRevoked: () => Promise<void>
  onCatalogRevoked: () => Promise<void>
  onRevalidar: () => void
}

export interface ClienteSyncEngine {
  requestSync: (force?: boolean) => Promise<void>
  resincronizar: () => Promise<void>
  eliminarBaseLocal: () => Promise<void>
  start: () => void
  stop: () => void
  handleOnline: () => void
  handleOffline: () => void
}

export function createClienteSyncEngine(options: EngineOptions): ClienteSyncEngine {
  let stopped = false
  let running: Promise<void> | null = null
  let queued = false
  let queuedForce = false
  let suspenderDescarga = false
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

  const halt = () => {
    stopped = true
    clearRetry()
    if (periodicTimer !== null) window.clearInterval(periodicTimer)
    periodicTimer = null
  }

  const responderAcceso = async (error: unknown) => {
    if (!(error instanceof ApiError)) return false
    if (error.status === 401) {
      halt()
      await options.onSessionRevoked()
      return true
    }
    if (error.status === 403) {
      halt()
      await options.onCatalogRevoked()
      return true
    }
    return false
  }

  const publishBlocked = (message: string) => {
    publish({
      phase: 'blocked',
      error: message,
      retryAt: null,
    })
  }

  const scheduleRetry = (error: unknown) => {
    const accessMessage = mensajeErrorAccesoClientes(error)
    if (accessMessage) {
      publishBlocked(accessMessage)
      return
    }

    const delay = retryDelay(error, backoffIndex)
    backoffIndex += 1
    const retryAt = Date.now() + delay
    const connectionHint = 'No fue posible conectar con GELIA. Reintentando…'
    publish({
      phase: navigator.onLine ? 'retrying' : 'offline',
      error: navigator.onLine ? connectionHint : 'La sincronización continuará al recuperar conexión.',
      retryAt,
    })
    clearRetry()
    retryTimer = window.setTimeout(() => {
      retryTimer = null
      void requestSync(false)
    }, delay)
  }

  const withCount = async (metadata: ClienteSyncMetadata): Promise<ClienteSyncMetadata> => {
    const downloaded = await contarClientesPorScope(options.scopeKey)
    const next = { ...metadata, downloaded }
    await guardarSyncMetadata(next)
    return next
  }

  const publicarListo = (metadata: ClienteSyncMetadata, requiereResincronizacion: boolean, error: string | null) => {
    publish({
      phase: 'ready',
      downloaded: metadata.downloaded,
      total: metadata.total,
      lastSyncedAt: metadata.lastSyncedAt,
      error,
      retryAt: null,
      requiereResincronizacion,
    })
  }

  const bootstrap = async (existing: ClienteSyncMetadata | null, reset: boolean): Promise<ClienteSyncMetadata> => {
    ensureActive()
    let metadata = existing
    const resume = !reset && Boolean(metadata?.snapshotId) && metadata?.complete === false
    if (!resume) {
      if (reset) await limpiarCatalogo(options.scopeKey)
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
        requiereResincronizacion: false,
        descargaSuspendida: false,
      }
      await guardarSyncMetadata(metadata)
    }

    if (!metadata?.snapshotId) throw new Error('No hay un snapshot activo para continuar la sincronización.')

    publish({
      phase: 'bootstrapping',
      downloaded: metadata.downloaded,
      total: metadata.total,
      lastSyncedAt: metadata.lastSyncedAt,
      error: null,
      retryAt: null,
      requiereResincronizacion: false,
    })

    const snapshotId = metadata.snapshotId
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
        requiereResincronizacion: false,
        descargaSuspendida: false,
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
      requiereResincronizacion: false,
      descargaSuspendida: false,
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

  const cerrarIncremental = async (
    metadata: ClienteSyncMetadata,
    authorizedTotal: number | null,
  ) => {
    const drift = authorizedTotal !== null && metadata.downloaded !== authorizedTotal
    const settled = {
      ...metadata,
      lastReconciledTotal: authorizedTotal,
      requiereResincronizacion: drift,
      descargaSuspendida: false,
    }
    await guardarSyncMetadata(settled)
    publicarListo(settled, drift, drift ? MENSAJE_DESFASE : null)
    return settled
  }

  const marcarRenovacion = async (error: unknown) => {
    if (!requiereNuevoBootstrap(error)) return false
    const downloaded = await contarClientesPorScope(options.scopeKey)
    if (downloaded === 0) {
      const metadata = await bootstrap(null, false)
      const refreshed = await incremental(metadata)
      await cerrarIncremental(refreshed.metadata, refreshed.authorizedTotal)
      options.onOnlineChange(true)
      backoffIndex = 0
      return true
    }

    const metadata = await leerSyncMetadata(options.scopeKey)
    if (metadata) {
      await guardarSyncMetadata({ ...metadata, downloaded, requiereResincronizacion: true })
    }
    publish({
      phase: 'ready',
      downloaded,
      total: metadata?.total ?? state.total,
      lastSyncedAt: metadata?.lastSyncedAt ?? state.lastSyncedAt,
      requiereResincronizacion: true,
      error: MENSAJE_RENOVAR,
      retryAt: null,
    })
    options.onOnlineChange(true)
    backoffIndex = 0
    return true
  }

  const publicarIncompleto = async (downloaded: number, metadata: ClienteSyncMetadata | null) => {
    if (metadata) {
      await guardarSyncMetadata({ ...metadata, downloaded, requiereResincronizacion: true })
    }
    publish({
      phase: 'ready',
      downloaded,
      total: metadata?.total ?? null,
      lastSyncedAt: metadata?.lastSyncedAt ?? null,
      requiereResincronizacion: true,
      error: MENSAJE_INCOMPLETO,
      retryAt: null,
    })
  }

  const runSyncBody = async (force: boolean) => {
    clearRetry()

    if (!options.canSync()) {
      publishBlocked(MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE)
      return
    }

    const stored = await leerSyncMetadata(options.scopeKey)
    const downloaded = await contarClientesPorScope(options.scopeKey)
    const metadata = stored ? { ...stored, downloaded } : null

    if ((suspenderDescarga || metadata?.descargaSuspendida) && !force) {
      publish({
        phase: 'idle',
        downloaded: 0,
        total: null,
        lastSyncedAt: null,
        error: null,
        retryAt: null,
        requiereResincronizacion: false,
      })
      return
    }

    if (force) suspenderDescarga = false

    if (!options.catalogoVigente()) {
      publish({
        phase: 'offline',
        downloaded,
        total: metadata?.total ?? null,
        lastSyncedAt: metadata?.lastSyncedAt ?? null,
        error: mensajeCatalogoRequiereConexion(downloaded),
        retryAt: null,
        requiereResincronizacion: metadata?.requiereResincronizacion === true,
      })
      if (navigator.onLine) options.onRevalidar()
      return
    }

    publish({
      phase: 'connecting',
      downloaded,
      total: metadata?.total ?? null,
      lastSyncedAt: metadata?.lastSyncedAt ?? null,
      error: 'Conectando con GELIA para preparar el catálogo…',
      retryAt: null,
    })

    if (!navigator.onLine) {
      options.onOnlineChange(false)
      publish({
        phase: 'offline',
        downloaded,
        error: 'La sincronización continuará al recuperar conexión.',
        retryAt: null,
      })
      scheduleRetry(new ApiError('Sin conexión.', 0))
      return
    }

    try {
      if (metadata?.complete) {
        const refreshed = await incremental(metadata)
        await cerrarIncremental(refreshed.metadata, refreshed.authorizedTotal)
      } else if (metadata?.snapshotId && !metadata.complete) {
        const rebuilt = await bootstrap(metadata, false)
        const refreshed = await incremental(rebuilt)
        await cerrarIncremental(refreshed.metadata, refreshed.authorizedTotal)
      } else if (downloaded === 0) {
        const rebuilt = await bootstrap(null, false)
        const refreshed = await incremental(rebuilt)
        await cerrarIncremental(refreshed.metadata, refreshed.authorizedTotal)
      } else {
        await publicarIncompleto(downloaded, metadata)
      }
      options.onOnlineChange(true)
      backoffIndex = 0
    } catch (error) {
      if (error instanceof SyncCancelled || stopped) return
      if (await responderAcceso(error)) return

      const accessMessage = mensajeErrorAccesoClientes(error)
      if (accessMessage) {
        publishBlocked(accessMessage)
        return
      }

      try {
        if (await marcarRenovacion(error)) return
      } catch (retryError) {
        if (retryError instanceof SyncCancelled || stopped) return
        if (await responderAcceso(retryError)) return
        const retryAccess = mensajeErrorAccesoClientes(retryError)
        if (retryAccess) {
          publishBlocked(retryAccess)
          return
        }
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

  const requestSync = (force = false) => {
    if (stopped) return Promise.resolve()
    if (force) suspenderDescarga = false
    if (running) {
      queued = true
      queuedForce = queuedForce || force
      return running
    }
    const useForce = force
    running = enqueue(async () => {
      if (stopped) return
      await runSyncBody(useForce)
    }).finally(() => {
      running = null
      if (queued && !stopped) {
        const nextForce = queuedForce
        queued = false
        queuedForce = false
        void requestSync(nextForce)
      }
    })
    return running
  }

  const resincronizar = () => {
    if (stopped) return Promise.resolve()
    suspenderDescarga = false
    return enqueue(async () => {
      if (stopped) return
      clearRetry()
      try {
        const metadata = await bootstrap(null, true)
        const refreshed = await incremental(metadata)
        await cerrarIncremental(refreshed.metadata, refreshed.authorizedTotal)
        options.onOnlineChange(true)
        backoffIndex = 0
      } catch (error) {
        if (error instanceof SyncCancelled || stopped) return
        if (await responderAcceso(error)) return
        publish({
          phase: 'error',
          error: errorMessage(error),
          retryAt: null,
        })
      }
    })
  }

  const eliminarBaseLocal = () => {
    if (stopped) return Promise.resolve()
    suspenderDescarga = true
    return enqueue(async () => {
      if (stopped) return
      clearRetry()
      await limpiarCatalogo(options.scopeKey)
      await guardarSyncMetadata(metadataVacia(options.scopeKey, true))
      publish({
        phase: 'idle',
        downloaded: 0,
        total: null,
        lastSyncedAt: null,
        error: null,
        retryAt: null,
        requiereResincronizacion: false,
      })
    })
  }

  const publicarGuardado = async () => {
    const metadata = await leerSyncMetadata(options.scopeKey)
    const downloaded = metadata?.descargaSuspendida ? 0 : await contarClientesPorScope(options.scopeKey)
    suspenderDescarga = metadata?.descargaSuspendida === true
    publish({
      phase: metadata?.descargaSuspendida ? 'idle' : (downloaded > 0 || metadata?.complete ? 'ready' : 'idle'),
      downloaded,
      total: metadata?.descargaSuspendida ? null : (metadata?.total ?? null),
      lastSyncedAt: metadata?.descargaSuspendida ? null : (metadata?.lastSyncedAt ?? null),
      error: metadata?.requiereResincronizacion ? MENSAJE_DESFASE : null,
      retryAt: null,
      requiereResincronizacion: metadata?.requiereResincronizacion === true,
    })
  }

  return {
    requestSync,
    resincronizar,
    eliminarBaseLocal,
    start: () => {
      if (!options.canSync()) {
        publishBlocked(MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE)
        return
      }
      void publicarGuardado()
        .catch(() => undefined)
        .then(() => {
          if (!stopped) void requestSync(false)
        })
      periodicTimer = window.setInterval(() => {
        if (!options.canSync()) return
        if (document.visibilityState === 'visible' && navigator.onLine) void requestSync(false)
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
      if (options.canSync()) void requestSync(false)
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
