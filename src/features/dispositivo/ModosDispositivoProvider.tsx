import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import {
  guardarModoKiosco,
  guardarModoSimple,
  leerModoKiosco,
  leerModoSimple,
} from '../../services/storage/preferenciasDispositivo'
import { ModosDispositivoContext } from './ModosDispositivoContext'

export function ModosDispositivoProvider({ children }: PropsWithChildren) {
  const [listo, setListo] = useState(false)
  const [modoSimple, setModoSimpleState] = useState(false)
  const [modoKiosco, setModoKioscoState] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([leerModoSimple(), leerModoKiosco()]).then(([simple, kiosco]) => {
      if (!active) return
      setModoSimpleState(simple)
      setModoKioscoState(kiosco)
      setListo(true)
    })
    return () => { active = false }
  }, [])

  const setModoSimple = useCallback(async (activa: boolean) => {
    await guardarModoSimple(activa)
    setModoSimpleState(activa)
  }, [])

  const setModoKiosco = useCallback(async (activa: boolean) => {
    await guardarModoKiosco(activa)
    setModoKioscoState(activa)
  }, [])

  const value = useMemo(
    () => ({ listo, modoSimple, modoKiosco, setModoSimple, setModoKiosco }),
    [listo, modoKiosco, modoSimple, setModoKiosco, setModoSimple],
  )

  return <ModosDispositivoContext.Provider value={value}>{children}</ModosDispositivoContext.Provider>
}
