import { createContext } from 'react'
import type { ClienteMovil, ClienteSyncState } from './cliente.types'

export interface ClienteLookupResult {
  cliente: ClienteMovil | null
  source: 'api' | 'local'
}

export interface ClienteSearchMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface ClienteSearchResult {
  data: ClienteMovil[]
  meta: ClienteSearchMeta
  source: 'api' | 'local'
}

export interface ClienteSyncContextValue {
  state: ClienteSyncState
  online: boolean
  findCliente: (numeroCliente: string) => Promise<ClienteLookupResult>
  searchClientes: (termino: string, page?: number) => Promise<ClienteSearchResult>
  syncNow: () => Promise<void>
}

export const ClienteSyncContext = createContext<ClienteSyncContextValue | null>(null)
