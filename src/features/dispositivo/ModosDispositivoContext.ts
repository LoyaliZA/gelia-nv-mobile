import { createContext } from 'react'

export interface ModosDispositivoContextValue {
  listo: boolean
  modoSimple: boolean
  modoKiosco: boolean
  setModoSimple: (activa: boolean) => Promise<void>
  setModoKiosco: (activa: boolean) => Promise<void>
}

export const ModosDispositivoContext = createContext<ModosDispositivoContextValue | null>(null)
