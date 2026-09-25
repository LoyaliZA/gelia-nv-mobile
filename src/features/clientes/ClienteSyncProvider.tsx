import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import type { MobileSession } from '../auth/auth.types'
import { buscarClienteRemoto, buscarClientesRemoto } from './cliente.api'
import { normalizeNumeroCliente } from './cliente.numero'
import { ClienteSyncContext } from './ClienteSyncContext'
import { createClienteSyncEngine } from './cliente.sync.engine'
import { buscarClienteLocal, buscarClientesLocal, guardarClientes } from './cliente.storage'
import type { ClienteSyncState } from './cliente.types'

interface Props extends PropsWithChildren { session: MobileSession }

const initialState: ClienteSyncState = {
  phase: 'idle',
  downloaded: 0,
  total: null,
  lastSyncedAt: null,
  error: null,
  retryAt: null,
}

export function ClienteSyncProvider({ children, session }: Props) {
  const [online, setOnline] = useState(navigator.onLine)
  const [state, setState] = useState(initialState)
  const sessionRef = useRef(session)
  const engineRef = useRef<ReturnType<typeof createClienteSyncEngine> | null>(null)
  const scopeKey = `${session.user.id}:${session.scopeVersion}`

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    const engine = createClienteSyncEngine({
      scopeKey,
      getSession: () => sessionRef.current,
      onState: setState,
      onOnlineChange: setOnline,
    })
    engineRef.current = engine
    engine.start()

    const onOnline = () => engine.handleOnline()
    const onOffline = () => engine.handleOffline()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void engine.requestSync()
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      engine.stop()
      engineRef.current = null
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [scopeKey])

  const syncNow = useCallback(() => engineRef.current?.requestSync() ?? Promise.resolve(), [])

  const findCliente = useCallback(async (numeroCliente: string) => {
    const numero = normalizeNumeroCliente(numeroCliente)
    if (!numero) return { cliente: null, source: 'local' as const }

    const local = await buscarClienteLocal(scopeKey, numero)
    if (local) return { cliente: local, source: 'local' as const }

    if (!navigator.onLine) {
      return { cliente: null, source: 'local' as const }
    }

    try {
      const cliente = await buscarClienteRemoto(session, numero)
      setOnline(true)
      await guardarClientes(scopeKey, [cliente])
      return { cliente, source: 'api' as const }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return { cliente: null, source: 'api' as const }
      if (error instanceof ApiError && error.status === 0) setOnline(false)
      return { cliente: null, source: 'local' as const }
    }
  }, [scopeKey, session])

  const searchClientes = useCallback(async (termino: string, page = 1) => {
    const normalized = termino.trim()
    const emptyMeta = { current_page: 1, last_page: 1, per_page: 10, total: 0 }
    if (!normalized) return { data: [], meta: emptyMeta, source: 'local' as const }

    if (navigator.onLine) {
      try {
        const pageResult = await buscarClientesRemoto(session, { q: normalized, page, perPage: 10 })
        setOnline(true)
        if (pageResult.data.length) await guardarClientes(scopeKey, pageResult.data)
        return { ...pageResult, source: 'api' as const }
      } catch (error) {
        if (error instanceof ApiError && error.status === 0) setOnline(false)
      }
    }

    const localPage = await buscarClientesLocal(scopeKey, normalized, page, 10)
    return { ...localPage, source: 'local' as const }
  }, [scopeKey, session])

  const value = useMemo(
    () => ({ state, online, findCliente, searchClientes, syncNow }),
    [findCliente, online, searchClientes, state, syncNow],
  )
  return <ClienteSyncContext.Provider value={value}>{children}</ClienteSyncContext.Provider>
}
