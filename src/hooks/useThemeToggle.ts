import { Preferences } from '@capacitor/preferences'
import { useCallback, useEffect, useState } from 'react'
import type { TemaVisual } from '../features/auth/auth.types'
import { applyGeliaTheme } from '../theme/applyGeliaTheme'

const THEME_OVERRIDE_KEY = 'gelia_mobile_theme_override'

async function readThemeOverride(): Promise<'dark' | 'light' | null> {
  try {
    const { value } = await Preferences.get({ key: THEME_OVERRIDE_KEY })
    if (value === 'dark' || value === 'light') return value
  } catch {
    // Capacitor no disponible en web dev
  }

  const stored = localStorage.getItem(THEME_OVERRIDE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return null
}

export async function clearThemeOverride() {
  await writeThemeOverride(null)
}

async function writeThemeOverride(mode: 'dark' | 'light' | null) {
  try {
    if (mode) {
      await Preferences.set({ key: THEME_OVERRIDE_KEY, value: mode })
    } else {
      await Preferences.remove({ key: THEME_OVERRIDE_KEY })
    }
  } catch {
    // noop
  }

  if (mode) localStorage.setItem(THEME_OVERRIDE_KEY, mode)
  else localStorage.removeItem(THEME_OVERRIDE_KEY)
}

export function useThemeToggle(baseTheme: TemaVisual = {}) {
  const [override, setOverride] = useState<'dark' | 'light' | null>(null)
  const [ready, setReady] = useState(false)

  const baseMode = baseTheme.modo === 'light' ? 'light' : 'dark'
  const effectiveMode = override ?? baseMode
  const isDarkMode = effectiveMode === 'dark'

  useEffect(() => {
    void readThemeOverride().then((value) => {
      setOverride(value)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    applyGeliaTheme({ ...baseTheme, modo: effectiveMode })
  }, [baseTheme, effectiveMode, ready])

  const toggleTheme = useCallback(() => {
    const next = isDarkMode ? 'light' : 'dark'
    setOverride(next)
    void writeThemeOverride(next)
  }, [isDarkMode])

  return { isDarkMode, toggleTheme, effectiveMode }
}
