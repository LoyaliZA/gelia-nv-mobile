import { ArrowLeft, Menu, Moon, Sun, X } from 'lucide-react'
import type { GeliaUser } from '../../features/auth/auth.types'
import { ProfileAvatar } from '../profile/ProfileAvatar'
import { GeliaLogo } from '../ui/GeliaLogo'

interface MobileBottomBarProps {
  accessOpen: boolean
  isDarkMode: boolean
  onBack: () => void
  onToggleAccess: () => void
  onToggleProfile: () => void
  onToggleTheme: () => void
  user: GeliaUser
}

export function MobileBottomBar({
  accessOpen,
  isDarkMode,
  onBack,
  onToggleAccess,
  onToggleProfile,
  onToggleTheme,
  user,
}: MobileBottomBarProps) {
  return (
    <nav aria-label="Barra de navegación móvil" className="mobile-bottom-bar">
      <div className="mobile-bottom-bar__widget">
        <div className="mobile-bottom-bar__left">
          <button
            aria-expanded={accessOpen}
            aria-label={accessOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="mobile-bottom-bar__icon-btn"
            onClick={onToggleAccess}
            type="button"
          >
            {accessOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button aria-label="Atrás" className="mobile-bottom-bar__icon-btn" onClick={onBack} type="button">
            <ArrowLeft size={20} />
          </button>
        </div>

        <button
          aria-label={accessOpen ? 'Cerrar menú' : 'Abrir menú de accesos'}
          className="mobile-bottom-bar__logo-btn"
          onClick={onToggleAccess}
          type="button"
        >
          <GeliaLogo className="gelia-logo--brand" variant="sparkle" />
        </button>

        <div className="mobile-bottom-bar__right">
          <button
            aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="mobile-bottom-bar__icon-btn"
            onClick={onToggleTheme}
            type="button"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            aria-label="Menú de perfil"
            className="mobile-bottom-bar__avatar-btn"
            onClick={onToggleProfile}
            type="button"
          >
            <ProfileAvatar className="mobile-bottom-bar__avatar" size="sm" user={user} />
          </button>
        </div>
      </div>
    </nav>
  )
}
