import type { PropsWithChildren } from 'react'
import { AuthProvider } from '../features/auth/AuthProvider'
import { ModosDispositivoProvider } from '../features/dispositivo/ModosDispositivoProvider'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <ModosDispositivoProvider>{children}</ModosDispositivoProvider>
    </AuthProvider>
  )
}
