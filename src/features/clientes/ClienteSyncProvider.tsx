import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { useAuth } from '../auth/useAuth'
import type { MobileSession } from '../auth/auth.types'
import { buscarClienteRemoto, buscarClientesRemoto } from './cliente.api'
import { MENSAJE_CATALOGO_REQUIERE_CONEXION, evaluarVentanaCatalogo } from './catalogoVentana'
import { normalizeNumeroCliente } from './cliente.numero'
import { ClienteSyncContext } from './ClienteSyncContext'
import { createClienteSyncEngine, registrarParadaSync } from './cliente.sync.engine'
import { buscarClienteLocal, buscarClientesLocal, guardarClientes } from './cliente.storage'
import type { ClienteSyncState } from './cliente.types'
import {
  MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE,
  mensajeErrorAccesoClientes,
  puedeConsultarClientesMovil,
} from './mobileClienteAccess'

interface Props extends PropsWithChildren { session: MobileSession }

function initialStateFor(canSync: boolean): ClienteSyncState {
  if (!canSync) {
    return {
      phase: 'blocked',
      downloaded: 0,
      total: null,
      lastSyncedAt: null,
      error: MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE,
      retryAt: null,
    }
  }

  return {
    phase: 'idle',
    downloaded: 0,
    total: null,
    lastSyncedAt: null,
    error: null,
    retryAt: null,
  }
}

function catalogoVigente(session: MobileSession) {
  return !session.catalogBlocked && evaluarVentanaCatalogo(session.catalogAuthorizedAt).allowed
}

export function ClienteSyncProvider({ children, session }: Props) {
  const auth = useAuth()
  const authRef = useRef(auth)
  const canSyncClientes = puedeConsultarClientesMovil(session.permissions)
  const [online, setOnline] = useState(navigator.onLine)
  const sessionRef = useRef(session)
  const canSyncRef = useRef(canSyncClientes)
  const engineRef = useRef<ReturnType<typeof createClienteSyncEngine> | null>(null)
  const scopeKey = `${session.user.id}:${session.scopeVersion}`
  const resetKey = `${scopeKey}:${canSyncClientes}:${session.catalogBlocked}:${session.catalogAuthorizedAt}`
  const [resetKeySeen, setResetKeySeen] = useState(resetKey)
  const [state, setState] = useState(() => session.catalogBlocked
    ? {
      phase: 'blocked' as const,
      downloaded: 0,
      total: null,
      lastSyncedAt: null,
      error: MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE,
      retryAt: null,
    }
    : initialStateFor(canSyncClientes))

  if (resetKey !== resetKeySeen) {
    setResetKeySeen(resetKey)
    setState(session.catalogBlocked
      ? {
        phase: 'blocked',
        downloaded: 0,
        total: null,
        lastSyncedAt: null,
        error: MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE,
        retryAt: null,
      }
      : initialStateFor(canSyncClientes))
  }

  useEffect(() => {
    sessionRef.current = session
    canSyncRef.current = puedeConsultarClientesMovil(session.permissions)
    authRef.current = auth
  }, [auth, session])

  useEffect(() => {
    if (session.catalogBlocked || !canSyncClientes) return

    const engine = createClienteSyncEngine({
      scopeKey,
      getSession: () => sessionRef.current,
      canSync: () => canSyncRef.current && !sessionRef.current.catalogBlocked,
      catalogoVigente: () => catalogoVigente(sessionRef.current),
      onState: setState,
      onOnlineChange: setOnline,
      onSessionRevoked: () => authRef.current.cerrarPorRevocacion(),
      onCatalogRevoked: () => authRef.current.revocarCatalogo(),
      onRevalidar: () => { void authRef.current.revalidarSesion() },
    })
    engineRef.current = engine
    const unregister = registrarParadaSync(() => engine.stop())
    engine.start()

    const onOnline = () => engine.handleOnline()
    const onOffline = () => engine.handleOffline()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && canSyncRef.current) void engine.requestSync()
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      unregister()
      engine.stop()
      engineRef.current = null
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [scopeKey, canSyncClientes, session.catalogAuthorizedAt, session.catalogBlocked])

  const syncNow = useCallback(() => {
    if (!canSyncRef.current || sessionRef.current.catalogBlocked) return Promise.resolve()
    return engineRef.current?.requestSync() ?? Promise.resolve()
  }, [])

  const findCliente = useCallback(async (numeroCliente: string) => {
    const numero = normalizeNumeroCliente(numeroCliente)
    if (!numero) return { cliente: null, source: 'local' as const }

    if (!canSyncRef.current || sessionRef.current.catalogBlocked) {
      return { cliente: null, source: 'local' as const, error: MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE }
    }

    if (!catalogoVigente(sessionRef.current)) {
      if (navigator.onLine) void authRef.current.revalidarSesion()
      return { cliente: null, source: 'local' as const, error: MENSAJE_CATALOGO_REQUIERE_CONEXION }
    }

    const local = await buscarClienteLocal(scopeKey, numero)
    if (local) return { cliente: local, source: 'local' as const }

    if (!navigator.onLine) {
      return { cliente: null, source: 'local' as const }
    }

    try {
      const cliente = await buscarClienteRemoto(session, numero)
      if (!catalogoVigente(sessionRef.current) || sessionRef.current.catalogBlocked) {
        return { cliente: null, source: 'api' as const, error: MENSAJE_CATALOGO_REQUIERE_CONEXION }
      }
      setOnline(true)
      await guardarClientes(scopeKey, [cliente])
      return { cliente, source: 'api' as const }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await authRef.current.cerrarPorRevocacion()
        return { cliente: null, source: 'api' as const }
      }
      if (error instanceof ApiError && error.status === 403) {
        await authRef.current.revocarCatalogo()
        return { cliente: null, source: 'api' as const, error: MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE }
      }
      const accessMessage = mensajeErrorAccesoClientes(error)
      if (accessMessage) return { cliente: null, source: 'api' as const, error: accessMessage }
      if (error instanceof ApiError && error.status === 404) return { cliente: null, source: 'api' as const }
      if (error instanceof ApiError && error.status === 0) setOnline(false)
      return { cliente: null, source: 'local' as const }
    }
  }, [scopeKey, session])

  const searchClientes = useCallback(async (termino: string, page = 1) => {
    const normalized = termino.trim()
    const emptyMeta = { current_page: 1, last_page: 1, per_page: 10, total: 0 }
    if (!normalized) return { data: [], meta: emptyMeta, source: 'local' as const }

    if (!canSyncRef.current || sessionRef.current.catalogBlocked) {
      return {
        data: [],
        meta: emptyMeta,
        source: 'local' as const,
        error: MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE,
      }
    }

    if (!catalogoVigente(sessionRef.current)) {
      if (navigator.onLine) void authRef.current.revalidarSesion()
      return {
        data: [],
        meta: emptyMeta,
        source: 'local' as const,
        error: MENSAJE_CATALOGO_REQUIERE_CONEXION,
      }
    }

    if (navigator.onLine) {
      try {
        const pageResult = await buscarClientesRemoto(session, { q: normalized, page, perPage: 10 })
        if (!catalogoVigente(sessionRef.current) || sessionRef.current.catalogBlocked) {
          return { data: [], meta: emptyMeta, source: 'api' as const, error: MENSAJE_CATALOGO_REQUIERE_CONEXION }
        }
        setOnline(true)
        if (pageResult.data.length) await guardarClientes(scopeKey, pageResult.data)
        return { ...pageResult, source: 'api' as const }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await authRef.current.cerrarPorRevocacion()
          return { data: [], meta: emptyMeta, source: 'api' as const }
        }
        if (error instanceof ApiError && error.status === 403) {
          await authRef.current.revocarCatalogo()
          return { data: [], meta: emptyMeta, source: 'api' as const, error: MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE }
        }
        const accessMessage = mensajeErrorAccesoClientes(error)
        if (accessMessage) {
          return { data: [], meta: emptyMeta, source: 'api' as const, error: accessMessage }
        }
        if (error instanceof ApiError && error.status === 0) setOnline(false)
      }
    }

    const localPage = await buscarClientesLocal(scopeKey, normalized, page, 10)
    return { ...localPage, source: 'local' as const }
  }, [scopeKey, session])

  const value = useMemo(
    () => ({
      state,
      online,
      canSyncClientes,
      findCliente,
      searchClientes,
      syncNow,
    }),
    [canSyncClientes, findCliente, online, searchClientes, state, syncNow],
  )
  return <ClienteSyncContext.Provider value={value}>{children}</ClienteSyncContext.Provider>
}
