import type { AppRoute } from '../../app/routes'
import type { GeliaUser } from '../../features/auth/auth.types'
import { Icon } from '../ui/Icon'

interface ProDrawerProps {
  activeRoute: AppRoute
  open: boolean
  onClose: () => void
  onLogout: () => Promise<void>
  onNavigate: (route: AppRoute) => void
  permissions: string[]
  user: GeliaUser
}

export function ProDrawer({ activeRoute, open, onClose, onLogout, onNavigate, permissions, user }: ProDrawerProps) {
  const navigate = (route: AppRoute) => { onNavigate(route); onClose() }

  return (
    <>
      <button aria-label="Cerrar menú" className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <aside aria-hidden={!open} className={`pro-drawer ${open ? 'open' : ''}`}>
        <header className="drawer-header">
          <div className="brand-lockup"><div className="gelia-mark">G</div><div><span className="eyebrow">GELIA-NV</span><strong>Mobile</strong></div></div>
          <button aria-label="Cerrar menú" className="icon-button" onClick={onClose}><Icon name="close" /></button>
        </header>
        <div className="drawer-user"><div className="drawer-avatar">{user.name.charAt(0).toUpperCase()}</div><div><strong>{user.name}</strong><span>{user.email || user.username}</span></div></div>
        <nav className="drawer-nav">
          <span className="drawer-label">NAVEGACIÓN_</span>
          <button className={activeRoute === 'inicio' ? 'active' : ''} onClick={() => navigate('inicio')}><Icon name="home" /><span>Inicio</span><Icon name="chevron" /></button>
          <button className={activeRoute === 'clientes' ? 'active' : ''} onClick={() => navigate('clientes')}><Icon name="users" /><span>Clientes</span><Icon name="chevron" /></button>
          <button className={activeRoute === 'perfil' ? 'active' : ''} onClick={() => navigate('perfil')}><Icon name="user" /><span>Mi perfil</span><Icon name="chevron" /></button>
        </nav>
        <footer className="drawer-footer">
          <div className="permission-summary"><Icon name="shield" /><span><strong>Acceso autorizado</strong><small>{permissions.length} permisos activos</small></span></div>
          <button className="drawer-logout" onClick={() => void onLogout()}><Icon name="logout" /> Cerrar sesión</button>
        </footer>
      </aside>
    </>
  )
}
