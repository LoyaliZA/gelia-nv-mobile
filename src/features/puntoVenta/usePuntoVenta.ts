import { useContext } from 'react'
import { PuntoVentaContext } from './PuntoVentaContext'

export function usePuntoVenta() {
  const value = useContext(PuntoVentaContext)
  if (!value) {
    throw new Error('usePuntoVenta debe usarse dentro de PuntoVentaProvider.')
  }
  return value
}
