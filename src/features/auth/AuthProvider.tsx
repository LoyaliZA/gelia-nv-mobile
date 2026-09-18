import { useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { clearSession, readSession, writeSession } from '../../services/storage/sessionStorage'
import { applyGeliaTheme, clearGeliaTheme } from '../../theme/applyGeliaTheme'
import { fetchMobileMe, loginMobile, logoutMobile } from './auth.api'
import { AuthContext } from './AuthContext'
import type { AuthState } from './AuthContext'
import type { LoginCredentials } from './auth.types'

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>(() => (
    readSession() ? { status: 'booting' } : { status: 'guest' }
  ))

  useEffect(() => {
    let active = true
    const stored = readSession()

    if (!stored) {
      return () => { active = false }
    }

    applyGeliaTheme(stored.temaVisual)
    fetchMobileMe(stored)
      .then((freshSession) => {
        if (!active) return
        writeSession(freshSession)
        applyGeliaTheme(freshSession.temaVisual)
        setState({ status: 'authenticated', session: freshSession })
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status !== 401) {
          setState({ status: 'authenticated', session: stored })
          return
        }
        clearSession()
        clearGeliaTheme()
        setState({ status: 'guest' })
      })

    return () => { active = false }
  }, [])

  const value = useMemo(() => ({
    state,
    login: async (credentials: LoginCredentials) => {
      const session = await loginMobile(credentials)
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
