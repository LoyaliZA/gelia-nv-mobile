import { useCallback, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { AppRoute } from '../app/routes'
import { MobileAccessSheet } from '../components/navigation/MobileAccessSheet'
import { MobileBottomBar } from '../components/navigation/MobileBottomBar'
import { MobileProfileSheet } from '../components/navigation/MobileProfileSheet'
import type { GeliaUser, TemaVisual } from '../features/auth/auth.types'
import { useThemeToggle } from '../hooks/useThemeToggle'

interface MobileAppLayoutProps extends PropsWithChildren {
  activeRoute: AppRoute
  onNavigate: (route: AppRoute) => void
  onLogout: () => Promise<void>
  temaVisual: TemaVisual
  user: GeliaUser
}

export function MobileAppLayout({
  activeRoute,
  children,
  onNavigate,
  onLogout,
  temaVisual,
  user,
}: MobileAppLayoutProps) {
  const [accessOpen, setAccessOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { isDarkMode, toggleTheme } = useThemeToggle(temaVisual)

  const closeSheets = useCallback(() => {
    setAccessOpen(false)
    setProfileOpen(false)
  }, [])

  const toggleAccess = useCallback(() => {
    setProfileOpen(false)
    setAccessOpen((prev) => !prev)
  }, [])

  const toggleProfile = useCallback(() => {
    setAccessOpen(false)
    setProfileOpen((prev) => !prev)
  }, [])

  const handleBack = useCallback(() => {
    if (accessOpen || profileOpen) {
      closeSheets()
      return
    }
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    if (activeRoute !== 'inicio') {
      onNavigate('inicio')
    }
  }, [accessOpen, activeRoute, closeSheets, onNavigate, profileOpen])

  const sheetOpen = accessOpen || profileOpen

  return (
    <div className="app-shell" data-sidebar-layout="mobile-bottom">
      <main className="app-content">{children}</main>

      {sheetOpen && (
        <button
          aria-label="Cerrar menú"
          className="mobile-sheet-backdrop mobile-sheet-backdrop--visible"
          onClick={closeSheets}
          type="button"
        />
      )}

      <MobileAccessSheet
        activeRoute={activeRoute}
        onClose={closeSheets}
        onNavigate={onNavigate}
        open={accessOpen}
      />
      <MobileProfileSheet
        onClose={closeSheets}
        onLogout={onLogout}
        onNavigate={onNavigate}
        open={profileOpen}
      />

      <MobileBottomBar
        accessOpen={accessOpen}
        isDarkMode={isDarkMode}
        onBack={handleBack}
        onToggleAccess={toggleAccess}
        onToggleProfile={toggleProfile}
        onToggleTheme={toggleTheme}
        user={user}
      />
    </div>
  )
}
