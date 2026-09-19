import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { AppRoute } from '../app/routes'
import { BottomNavigation } from '../components/navigation/BottomNavigation'
import { MobileTopBar } from '../components/navigation/MobileTopBar'
import { ProDrawer } from '../components/navigation/ProDrawer'
import type { MobileSession } from '../features/auth/auth.types'
import { useClienteSync } from '../features/clientes/useClienteSync'

interface MobileAppLayoutProps extends PropsWithChildren {
  activeRoute: AppRoute
  onNavigate: (route: AppRoute) => void
  onLogout: () => Promise<void>
  session: MobileSession
}

export function MobileAppLayout({ activeRoute, children, onNavigate, onLogout, session }: MobileAppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { online } = useClienteSync()
  return (
    <div className="app-shell">
      <MobileTopBar activeRoute={activeRoute} online={online} onMenuOpen={() => setDrawerOpen(true)} onNavigate={onNavigate} session={session} />
      <ProDrawer activeRoute={activeRoute} onClose={() => setDrawerOpen(false)} onLogout={onLogout} onNavigate={onNavigate} open={drawerOpen} permissions={session.permissions} user={session.user} />
      <main className="app-content">{children}</main>
      <BottomNavigation activeRoute={activeRoute} onNavigate={onNavigate} />
    </div>
  )
}
