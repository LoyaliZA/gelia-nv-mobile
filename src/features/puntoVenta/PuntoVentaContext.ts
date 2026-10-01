import { createContext } from 'react'
import type { PuntoVentaContexto } from './puntoVenta.types'

export type PuntoVentaStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface PuntoVentaContextValue {
  status: PuntoVentaStatus
  contexto: PuntoVentaContexto | null
  error: string | null
  cambiandoSucursal: boolean
  refresh: () => Promise<void>
  seleccionarSucursal: (sucursalId: number) => Promise<boolean>
}

export const PuntoVentaContext = createContext<PuntoVentaContextValue | null>(null)
