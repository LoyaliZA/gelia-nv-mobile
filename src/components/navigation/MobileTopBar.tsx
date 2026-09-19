import { useState } from 'react'
import type { AppRoute } from '../../app/routes'
import type { MobileSession } from '../../features/auth/auth.types'
import { NotificationCenter } from '../../features/notifications/NotificationCenter'
import { GeliaLogo } from '../ui/GeliaLogo'
import { Icon } from '../ui/Icon'

interface MobileTopBarProps {
  activeRoute: AppRoute
  online: boolean
  onMenuOpen: () => void
  onNavigate: (route: AppRoute) => void
  session: MobileSession
}

const titles: Record<AppRoute, string> = { inicio: 'Inicio', clientes: 'Clientes', perfil: 'Mi perfil' }

export function MobileTopBar({ activeRoute, online, onMenuOpen, onNavigate, session }: MobileTopBarProps) {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'))

  const toggleTheme = () => {
    const nextDarkMode = !darkMode
    document.documentElement.classList.toggle('dark', nextDarkMode)
    setDarkMode(nextDarkMode)
  }

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    onNavigate('inicio')
  }

  return (
    <header className="mobile-header">
      <span className="sr-only">Sección actual: {titles[activeRoute]}</span>
      <nav aria-label="Controles de GELIA" className="mobile-navbar">
        <div className="mobile-navbar-group">
          <button aria-label="Abrir menú" className="navbar-icon-button" onClick={onMenuOpen} type="button"><Icon name="menu" /></button>
          <button aria-label={darkMode ? 'Usar tema claro' : 'Usar tema oscuro'} className="navbar-plain-button" onClick={toggleTheme} type="button"><Icon name={darkMode ? 'sun' : 'moon'} /></button>
          <button aria-label="Volver" className="navbar-plain-button" onClick={goBack} type="button"><Icon name="arrow-left" /></button>
        </div>

        <button aria-label="Ir al inicio" className="navbar-logo-button" onClick={() => onNavigate('inicio')} type="button">
          <GeliaLogo className="gelia-logo--navbar" variant="sparkle" />
          <span className={`connection-dot${online ? '' : ' connection-dot--offline'}`} title={online ? 'Con conexión' : 'Sin conexión'} />
        </button>

        <div className="mobile-navbar-group mobile-navbar-group--actions">
          <NotificationCenter session={session} />
          <button aria-label="Abrir mi perfil" className="navbar-avatar" onClick={() => onNavigate('perfil')} type="button">{session.user.name.charAt(0).toUpperCase()}</button>
        </div>
      </nav>
    </header>
  )
}
