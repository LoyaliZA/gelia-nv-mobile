import { createContext } from 'react'
import type { LoginCredentials, MobileSession } from './auth.types'

export type AuthState =
  | { status: 'booting' }
  | { status: 'guest' }
  | { status: 'authenticated'; session: MobileSession }

export interface AuthContextValue {
  state: AuthState
  login: (credentials: LoginCredentials) => Promise<void>
  loginWithPasskey: (login: string) => Promise<void>
  logout: () => Promise<void>
  updateSession: (session: MobileSession) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
