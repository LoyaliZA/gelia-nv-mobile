import { useContext } from 'react'
import { ModosDispositivoContext } from './ModosDispositivoContext'

export function useModosDispositivo() {
  const context = useContext(ModosDispositivoContext)
  if (!context) throw new Error('useModosDispositivo debe utilizarse dentro de ModosDispositivoProvider.')
  return context
}
