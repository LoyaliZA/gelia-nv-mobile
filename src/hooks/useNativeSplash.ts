import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { useEffect } from 'react'

/** Oculta el splash nativo cuando la WebView ya renderizó la UI. */
export function useNativeSplash() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    void SplashScreen.hide({ fadeOutDuration: 280 })
  }, [])
}
