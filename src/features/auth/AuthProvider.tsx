import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { purgarScopesObsoletos, purgarTodoElCatalogo } from '../clientes/cliente.storage'
import { detenerSincronizacion } from '../clientes/cliente.sync.engine'
import { ApiError } from '../../lib/api/apiClient'
import { clearSession, hydrateStorage, peekSession, writeSession } from '../../services/storage/sessionStorage'
import { applyGeliaTheme, clearGeliaTheme } from '../../theme/applyGeliaTheme'
import { fetchMobileMe, loginMobile, loginWithPasskey as loginWithPasskeyApi, logoutMobile } from './auth.api'
import { AuthContext } from './AuthContext'
import type { AuthState } from './AuthContext'
import type { LoginCredentials, MobileSession } from './auth.types'

const SESION_NO_GUARDADA = 'No se pudo guardar la sesión en este dispositivo. Vuelve a intentar el acceso.'

function scopeKey(session: MobileSession) {
  return `${session.user.id}:${session.scopeVersion}`
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: 'booting' })
  const stateRef = useRef(state)
  const refreshing = useRef(false)
  const refrescarRef = useRef<(session: MobileSession) => Promise<void>>(async () => undefined)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const irAInvitado = () => {
    clearGeliaTheme()
    setState({ status: 'guest' })
  }

  const persistir = async (session: MobileSession) => {
    const previous = peekSession()
    const cambiaScope = previous !== null && scopeKey(previous) !== scopeKey(session)
    if (cambiaScope) detenerSincronizacion()

    const saved = await writeSession(session)
    if (!saved) {
      detenerSincronizacion()
      await purgarTodoElCatalogo()
      irAInvitado()
      return false
    }

    if (previous && previous.user.id !== session.user.id) {
      await purgarTodoElCatalogo()
    } else if (previous && previous.scopeVersion !== session.scopeVersion) {
      await purgarScopesObsoletos(scopeKey(session))
    }
    return true
  }

  const publicar = async (session: MobileSession) => {
    const saved = await persistir(session)
    if (!saved) return false
    applyGeliaTheme(session.temaVisual)
    setState({ status: 'authenticated', session })
    return true
  }

  const cerrarPorRevocacion = async () => {
    detenerSincronizacion()
    await clearSession()
    await purgarTodoElCatalogo()
    irAInvitado()
  }

  const revocarCatalogo = async () => {
    detenerSincronizacion()
    await purgarTodoElCatalogo()
    const current = stateRef.current
    const base = current.status === 'authenticated' ? current.session : peekSession()
    if (!base) {
      irAInvitado()
      return
    }
    const session: MobileSession = { ...base, catalogBlocked: true }
    const saved = await writeSession(session)
    if (!saved) {
      irAInvitado()
      return
    }
    setState({ status: 'authenticated', session })
  }

  const refrescar = async (session: MobileSession) => {
    try {
      const fresh = await fetchMobileMe(session)
      await publicar(fresh)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        await cerrarPorRevocacion()
        return
      }
      if (error instanceof ApiError && error.status === 403) {
        await revocarCatalogo()
        return
      }
      applyGeliaTheme(session.temaVisual)
      setState({ status: 'authenticated', session })
    }
  }

  useEffect(() => {
    refrescarRef.current = refrescar
  }, [refrescar])

  useEffect(() => {
    let active = true

    void hydrateStorage().then((stored) => {
      if (!active) return
      if (!stored) {
        setState({ status: 'guest' })
        return
      }
      applyGeliaTheme(stored.temaVisual)
      void refrescarRef.current(stored)
    })

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const current = stateRef.current
      if (current.status !== 'authenticated') return
      void refrescarRef.current(current.session)
    }

    document.addEventListener('visibilitychange', onVisible)

    let appStateListener: { remove: () => Promise<void> } | undefined
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) return
        const current = stateRef.current
        if (current.status !== 'authenticated') return
        void refrescarRef.current(current.session)
      }).then((listener) => {
        if (!active) {
          void listener.remove()
          return
        }
        appStateListener = listener
      })
    }

    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisible)
      void appStateListener?.remove()
    }
  }, [])

  const value = {
    state,
    updateSession: async (session: MobileSession) => {
      await publicar(session)
    },
    login: async (credentials: LoginCredentials) => {
      const session = await loginMobile(credentials)
      detenerSincronizacion()
      await purgarTodoElCatalogo()
      const saved = await publicar(session)
      if (!saved) throw new Error(SESION_NO_GUARDADA)
    },
    loginWithPasskey: async (login: string) => {
      const session = await loginWithPasskeyApi(login)
      detenerSincronizacion()
      await purgarTodoElCatalogo()
      const saved = await publicar(session)
      if (!saved) throw new Error(SESION_NO_GUARDADA)
    },
    logout: async () => {
      detenerSincronizacion()
      const current = stateRef.current
      if (current.status === 'authenticated') {
        try {
          await logoutMobile(current.session)
        } catch {
          // Sin red no hay revocación remota. Los datos locales se borran igual.
        }
      }
      await clearSession()
      await purgarTodoElCatalogo()
      irAInvitado()
    },
    cerrarPorRevocacion,
    revocarCatalogo,
    revalidarSesion: async () => {
      if (refreshing.current) return
      const current = stateRef.current
      if (current.status !== 'authenticated') return
      refreshing.current = true
      try {
        await refrescar(current.session)
      } finally {
        refreshing.current = false
      }
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
