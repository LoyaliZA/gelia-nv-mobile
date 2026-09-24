import { LogOut, Settings2, User } from 'lucide-react'
import type { AppRoute } from '../../app/routes'

interface MobileProfileSheetProps {
  onClose: () => void
  onLogout: () => Promise<void>
  onNavigate: (route: AppRoute) => void
  open: boolean
}

const items: Array<{ id: string; label: string; icon: typeof User; route: AppRoute | null; disabled?: boolean }> = [
  { id: 'perfil', label: 'Mi perfil', icon: User, route: 'perfil' },
  { id: 'preferencias', label: 'Preferencias', icon: Settings2, route: 'preferencias' },
]

export function MobileProfileSheet({ onClose, onLogout, onNavigate, open }: MobileProfileSheetProps) {
  return (
    <aside
      aria-hidden={!open}
      className={`mobile-bottom-sheet mobile-bottom-sheet--profile${open ? ' mobile-bottom-sheet--open' : ''}`}
    >
      <span className="sidebar-nav-header">PERFIL_</span>
      <nav aria-label="Perfil" className="mobile-profile-links">
        {items.map((item) => {
          const Icon = item.icon
          const disabled = item.disabled || !item.route
          return (
            <button
              aria-disabled={disabled}
              className={`sidebar-nav-link sidebar-nav-link--l2${disabled ? ' sidebar-nav-link--disabled' : ''}`}
              disabled={disabled}
              key={item.id}
              onClick={() => {
                if (item.route) {
                  onNavigate(item.route)
                  onClose()
                }
              }}
              type="button"
            >
              <Icon size={16} />
              <span className="sidebar-nav-link__label">{item.label}</span>
              {disabled ? <span className="sidebar-nav-link__badge">Próximamente</span> : null}
            </button>
          )
        })}
      </nav>
      <button
        className="mobile-profile-logout"
        onClick={() => { void onLogout() }}
        type="button"
      >
        <LogOut size={16} />
        Cerrar sesión_
      </button>
    </aside>
  )
}
