import { createContext } from 'react'
import type { ClienteMovil, ClienteSyncState } from './cliente.types'

export interface ClienteLookupResult {
  cliente: ClienteMovil | null
  source: 'api' | 'local'
}

export interface ClienteSyncContextValue {
  state: ClienteSyncState
  online: boolean
  findCliente: (numeroCliente: string) => Promise<ClienteLookupResult>
  syncNow: () => Promise<void>
}

export const ClienteSyncContext = createContext<ClienteSyncContextValue | null>(null)
