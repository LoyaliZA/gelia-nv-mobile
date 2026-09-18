import type { AppRoute } from '../../app/routes'
import { Icon } from '../ui/Icon'

interface BottomNavigationProps { activeRoute: AppRoute; onNavigate: (route: AppRoute) => void }

const items = [
  { route: 'inicio' as const, label: 'Inicio', icon: 'home' as const },
  { route: 'clientes' as const, label: 'Clientes', icon: 'users' as const },
  { route: 'perfil' as const, label: 'Perfil', icon: 'user' as const },
]

export function BottomNavigation({ activeRoute, onNavigate }: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label="Navegación principal">
      {items.map((item) => (
        <button aria-current={activeRoute === item.route ? 'page' : undefined} className={activeRoute === item.route ? 'active' : ''} key={item.route} onClick={() => onNavigate(item.route)}>
          <span><Icon name={item.icon} /></span>{item.label}
        </button>
      ))}
    </nav>
  )
}
