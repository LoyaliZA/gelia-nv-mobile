import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { AppRoute } from '../app/routes'
import { BottomNavigation } from '../components/navigation/BottomNavigation'
import { ProDrawer } from '../components/navigation/ProDrawer'
import { Icon } from '../components/ui/Icon'
import type { GeliaUser } from '../features/auth/auth.types'

interface MobileAppLayoutProps extends PropsWithChildren {
  activeRoute: AppRoute
  onNavigate: (route: AppRoute) => void
  onLogout: () => Promise<void>
  permissions: string[]
  user: GeliaUser
}

const titles: Record<AppRoute, string> = { inicio: 'Inicio', clientes: 'Clientes', perfil: 'Mi perfil' }

export function MobileAppLayout({ activeRoute, children, onNavigate, onLogout, permissions, user }: MobileAppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <div className="app-shell">
      <header className="mobile-header">
        <button aria-label="Abrir menú" className="icon-button" onClick={() => setDrawerOpen(true)}><Icon name="menu" /></button>
        <div className="mobile-header-title"><span>{titles[activeRoute]}</span><small>GELIA-NV</small></div>
        <div className="online-indicator" title="Sesión activa"><span /> En línea</div>
      </header>
      <ProDrawer activeRoute={activeRoute} onClose={() => setDrawerOpen(false)} onLogout={onLogout} onNavigate={onNavigate} open={drawerOpen} permissions={permissions} user={user} />
      <main className="app-content">{children}</main>
      <BottomNavigation activeRoute={activeRoute} onNavigate={onNavigate} />
    </div>
  )
}
