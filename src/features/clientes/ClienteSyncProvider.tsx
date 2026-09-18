import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import type { MobileSession } from '../auth/auth.types'
import {
  buscarClienteRemoto,
  completarBootstrap,
  descargarCambios,
  descargarPaginaBootstrap,
  iniciarBootstrap,
  requiereNuevoBootstrap,
} from './cliente.api'
import { ClienteSyncContext } from './ClienteSyncContext'
import {
  buscarClienteLocal,
  eliminarClientePorId,
  guardarClientes,
  guardarSyncMetadata,
  leerSyncMetadata,
  limpiarCatalogo,
} from './cliente.storage'
import type { ClienteSyncMetadata } from './cliente.storage'
import type { ClienteSyncState } from './cliente.types'

interface Props extends PropsWithChildren { session: MobileSession }

const initialState: ClienteSyncState = {
  phase: 'idle',
  downloaded: 0,
  total: null,
  lastSyncedAt: null,
  error: null,
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'No fue posible sincronizar los clientes.'
}

export function ClienteSyncProvider({ children, session }: Props) {
  const [online, setOnline] = useState(navigator.onLine)
  const [state, setState] = useState(initialState)
  const running = useRef<Promise<void> | null>(null)
  const scopeKey = `${session.user.id}:${session.scopeVersion}`

  const bootstrap = useCallback(async (existing?: ClienteSyncMetadata | null) => {
    let metadata = existing
    if (!metadata?.snapshotId || metadata.complete) {
      await limpiarCatalogo(scopeKey)
      const started = await iniciarBootstrap(session)
      metadata = {
        scopeKey,
        snapshotId: started.snapshotId,
        downloaded: 0,
        total: started.total,
        maxClienteId: 0,
        cursor: null,
        complete: false,
        lastSyncedAt: null,
      }
      await guardarSyncMetadata(metadata)
    }

    setState({
      phase: 'bootstrapping',
      downloaded: metadata.downloaded,
      total: metadata.total,
      lastSyncedAt: metadata.lastSyncedAt,
      error: null,
    })

    const snapshotId = metadata.snapshotId
    if (!snapshotId) throw new Error('No hay un snapshot activo para continuar la sincronización.')
    let hasMore = true
    while (hasMore) {
      const page = await descargarPaginaBootstrap(session, snapshotId, metadata.maxClienteId)
      await guardarClientes(scopeKey, page.clientes)
      metadata = {
        ...metadata,
        downloaded: metadata.downloaded + page.clientes.length,
        maxClienteId: page.maxClienteId,
      }
      await guardarSyncMetadata(metadata)
      setState((current) => ({ ...current, downloaded: metadata!.downloaded, total: metadata!.total }))
      hasMore = page.hasMore
      if (hasMore && page.clientes.length === 0) throw new Error('GELIA devolvió una página vacía durante la sincronización.')
    }

    const cursor = await completarBootstrap(
      session,
      snapshotId,
      metadata.downloaded,
      metadata.maxClienteId,
    )
    const completed: ClienteSyncMetadata = {
      ...metadata,
      snapshotId: null,
      cursor,
      complete: true,
      lastSyncedAt: new Date().toISOString(),
    }
    await guardarSyncMetadata(completed)
    return completed
  }, [scopeKey, session])

  const incremental = useCallback(async (metadata: ClienteSyncMetadata) => {
    let current = metadata
    let hasMore = true
    setState({
      phase: 'incremental',
      downloaded: current.downloaded,
      total: current.total,
      lastSyncedAt: current.lastSyncedAt,
      error: null,
    })
    while (hasMore) {
      const page = await descargarCambios(session, current.cursor ?? 0)
      for (const event of page.events) {
        if ((event.operation === 'granted' || event.operation === 'updated') && event.data) {
          await guardarClientes(scopeKey, [event.data])
        } else if (event.operation === 'deleted' || event.operation === 'revoked') {
          await eliminarClientePorId(scopeKey, Number(event.aggregate_id))
        }
      }
      current = { ...current, cursor: page.cursor, lastSyncedAt: new Date().toISOString() }
      await guardarSyncMetadata(current)
      hasMore = page.hasMore
      if (hasMore && page.events.length === 0) break
    }
    return current
  }, [scopeKey, session])

  const runSync = useCallback(async () => {
    try {
      let metadata = await leerSyncMetadata(scopeKey)
      metadata = metadata?.complete ? await incremental(metadata) : await bootstrap(metadata)
      setOnline(true)
      setState({
        phase: 'ready',
        downloaded: metadata.downloaded,
        total: metadata.total,
        lastSyncedAt: metadata.lastSyncedAt,
        error: null,
      })
    } catch (error) {
      let syncError = error
      if (requiereNuevoBootstrap(syncError)) {
        await limpiarCatalogo(scopeKey)
        try {
          const metadata = await bootstrap(null)
          setOnline(true)
          setState({
            phase: 'ready',
            downloaded: metadata.downloaded,
            total: metadata.total,
            lastSyncedAt: metadata.lastSyncedAt,
            error: null,
          })
          return
        } catch (retryError) {
          syncError = retryError
        }
      }
      const isOffline = syncError instanceof ApiError && syncError.status === 0
      setOnline(isOffline ? false : navigator.onLine)
      setState((current) => ({
        ...current,
        phase: isOffline ? 'offline' : 'error',
        error: errorMessage(syncError),
      }))
    }
  }, [bootstrap, incremental, scopeKey])

  const syncNow = useCallback(() => {
    if (!running.current) {
      running.current = runSync().finally(() => { running.current = null })
    }
    return running.current
  }, [runSync])

  useEffect(() => {
    void syncNow()
    const onOnline = () => { void syncNow() }
    const onOffline = () => { setOnline(false) }
    const onVisible = () => { if (document.visibilityState === 'visible') void syncNow() }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [syncNow])

  const findCliente = useCallback(async (numeroCliente: string) => {
    const catalogPending = state.phase !== 'ready'
    if (catalogPending) {
      try {
        const cliente = await buscarClienteRemoto(session, numeroCliente)
        setOnline(true)
        return { cliente, source: 'api' as const }
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return { cliente: null, source: 'api' as const }
        if (error instanceof ApiError && error.status === 0) setOnline(false)
      }
    }
    return { cliente: await buscarClienteLocal(scopeKey, numeroCliente), source: 'local' as const }
  }, [scopeKey, session, state.phase])

  const value = useMemo(() => ({ state, online, findCliente, syncNow }), [findCliente, online, state, syncNow])
  return <ClienteSyncContext.Provider value={value}>{children}</ClienteSyncContext.Provider>
}
