import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { MobileSession } from '../auth/auth.types'
import { PuntoVentaContext } from './PuntoVentaContext'
import type { PuntoVentaStatus } from './PuntoVentaContext'
import { puedeAccederPuntoVenta } from './puntoVentaAccess'
import {
  establecerSucursalActivaPuntoVenta,
  obtenerContextoPuntoVenta,
} from './puntoVenta.api'
import { mensajeErrorPdv } from './puntoVenta.errors'
import type { PuntoVentaContexto } from './puntoVenta.types'
import './puntoVenta.css'

interface PuntoVentaProviderProps extends PropsWithChildren {
  session: MobileSession
}

export function PuntoVentaProvider({ children, session }: PuntoVentaProviderProps) {
  const tieneAcceso = puedeAccederPuntoVenta(session.permissions)
  const [status, setStatus] = useState<PuntoVentaStatus>('idle')
  const [contexto, setContexto] = useState<PuntoVentaContexto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cambiandoSucursal, setCambiandoSucursal] = useState(false)

  const refresh = useCallback(async () => {
    if (!tieneAcceso) {
      setStatus('idle')
      setContexto(null)
      setError(null)
      return
    }

    setStatus((current) => current === 'ready' ? current : 'loading')
    setError(null)

    try {
      const next = await obtenerContextoPuntoVenta(session)
      setContexto(next)
      setStatus('ready')
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo cargar el contexto de Punto de Venta.'))
      setStatus('error')
    }
  }, [session, tieneAcceso])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const seleccionarSucursal = useCallback(async (sucursalId: number) => {
    if (!tieneAcceso || cambiandoSucursal) return false

    setCambiandoSucursal(true)
    setError(null)

    try {
      const next = await establecerSucursalActivaPuntoVenta(session, sucursalId)
      setContexto(next)
      setStatus('ready')
      return true
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo cambiar la sucursal activa.'))
      return false
    } finally {
      setCambiandoSucursal(false)
    }
  }, [cambiandoSucursal, session, tieneAcceso])

  const value = useMemo(() => ({
    status,
    contexto,
    error,
    cambiandoSucursal,
    refresh,
    seleccionarSucursal,
  }), [
    status,
    contexto,
    error,
    cambiandoSucursal,
    refresh,
    seleccionarSucursal,
  ])

  return (
    <PuntoVentaContext.Provider value={value}>
      {children}
    </PuntoVentaContext.Provider>
  )
}
