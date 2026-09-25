import { Capacitor } from '@capacitor/core'
import { CapacitorPasskey } from '@capgo/capacitor-passkey'
import { useEffect, useState } from 'react'
import { webAuthnSoportado } from './auth.api'

export const MENSAJE_PASSKEY_NO_DISPONIBLE =
  'Este dispositivo no puede usar huella con GELIA. Configura bloqueo de pantalla o huella en Android, actualiza Google Play Services e instala la versión más reciente de la app.'

export function usePasskeyDisponible() {
  const [disponible, setDisponible] = useState(false)
  const [evaluando, setEvaluando] = useState(true)

  useEffect(() => {
    let activo = true

    const evaluar = async () => {
      setEvaluando(true)
      try {
        if (Capacitor.isNativePlatform()) {
          const soporte = await CapacitorPasskey.isSupported()
          if (activo) setDisponible(soporte.available)
          return
        }
        if (activo) setDisponible(webAuthnSoportado())
      } catch {
        if (activo) setDisponible(webAuthnSoportado())
      } finally {
        if (activo) setEvaluando(false)
      }
    }

    void evaluar()

    return () => {
      activo = false
    }
  }, [])

  return { disponible, evaluando }
}
