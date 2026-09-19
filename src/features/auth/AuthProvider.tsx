import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { clearSession, hydrateStorage, readSession, writeSession } from '../../services/storage/sessionStorage'
import { applyGeliaTheme, clearGeliaTheme } from '../../theme/applyGeliaTheme'
import { fetchMobileMe, loginMobile, loginWithPasskey as loginWithPasskeyApi, logoutMobile } from './auth.api'
import { AuthContext } from './AuthContext'
import type { AuthState } from './AuthContext'
import type { LoginCredentials, MobileSession } from './auth.types'

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: 'booting' })

  useEffect(() => {
    let active = true

    const applySession = (session: MobileSession) => {
      writeSession(session)
      applyGeliaTheme(session.temaVisual)
      setState({ status: 'authenticated', session })
    }

    const refreshSession = (session: MobileSession) => fetchMobileMe(session)
      .then((freshSession) => {
        if (!active) return
        applySession(freshSession)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status !== 401) {
          applyGeliaTheme(session.temaVisual)
          setState({ status: 'authenticated', session })
          return
        }
        clearSession()
        clearGeliaTheme()
        setState({ status: 'guest' })
      })

    void hydrateStorage().then(() => {
      if (!active) return
      const stored = readSession()
      if (!stored) {
        setState({ status: 'guest' })
        return
      }
      applyGeliaTheme(stored.temaVisual)
      void refreshSession(stored)
    })

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const current = readSession()
      if (!current) return
      applyGeliaTheme(current.temaVisual)
      void refreshSession(current)
    }

    document.addEventListener('visibilitychange', onVisible)

    let appStateListener: { remove: () => void } | undefined
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) return
        const current = readSession()
        if (!current) return
        applyGeliaTheme(current.temaVisual)
        void refreshSession(current)
      }).then((listener) => {
        if (!active) {
          listener.remove()
          return
        }
        appStateListener = listener
      })
    }

    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisible)
      appStateListener?.remove()
    }
  }, [])

  const value = useMemo(() => ({
    state,
    login: async (credentials: LoginCredentials) => {
      const session = await loginMobile(credentials)
      writeSession(session)
      applyGeliaTheme(session.temaVisual)
      setState({ status: 'authenticated', session })
    },
    loginWithPasskey: async (login: string) => {
      const session = await loginWithPasskeyApi(login)
      writeSession(session)
      applyGeliaTheme(session.temaVisual)
      setState({ status: 'authenticated', session })
    },
    logout: async () => {
      if (state.status === 'authenticated') {
        try {
          await logoutMobile(state.session)
        } catch {
          // La sesión local siempre se cierra, aun si el equipo perdió conexión.
        }
      }
      clearSession()
      clearGeliaTheme()
      setState({ status: 'guest' })
    },
  }), [state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
