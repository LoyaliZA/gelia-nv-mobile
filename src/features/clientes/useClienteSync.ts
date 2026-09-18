import { useContext } from 'react'
import { ClienteSyncContext } from './ClienteSyncContext'

export function useClienteSync() {
  const context = useContext(ClienteSyncContext)
  if (!context) throw new Error('useClienteSync debe utilizarse dentro de ClienteSyncProvider.')
  return context
}
