import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { passkeyRelyingPartyOrigin } from '../features/auth/passkeyBootstrap'

export function privacidadAppUrl() {
  return new URL('/privacidad-app', passkeyRelyingPartyOrigin()).toString()
}

export async function abrirPrivacidad() {
  const url = privacidadAppUrl()
  try {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url })
      return
    }
  } catch {
    // Si el navegador del sistema no abre, se intenta en una pestaña.
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
