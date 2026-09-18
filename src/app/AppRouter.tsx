import { DashboardView } from '../features/dashboard/DashboardView'
import { LoginView } from '../features/auth/LoginView'
import { useAuth } from '../features/auth/useAuth'
import { ClienteBusquedaView } from '../features/clientes/ClienteBusquedaView'
import { PerfilView } from '../features/profile/PerfilView'
import { MobileAppLayout } from '../layouts/MobileAppLayout'
import { useAppRoute } from './routes'

export function AppRouter() {
  const auth = useAuth()
  const { route, navigate } = useAppRoute()

  if (auth.status === 'booting') {
    return (
      <main className="splash-screen" aria-live="polite">
        <div className="gelia-mark gelia-mark--large">G</div>
        <div className="splash-pulse" />
        <p>Validando sesión segura…</p>
      </main>
    )
  }

  if (auth.status === 'guest') {
    return <LoginView onLogin={auth.login} />
  }

  return (
    <MobileAppLayout
      activeRoute={route}
      onNavigate={navigate}
      onLogout={auth.logout}
      permissions={auth.session.permissions}
      user={auth.session.user}
    >
      {route === 'inicio' && <DashboardView onOpenClients={() => navigate('clientes')} />}
      {route === 'clientes' && <ClienteBusquedaView />}
      {route === 'perfil' && <PerfilView session={auth.session} onLogout={auth.logout} />}
    </MobileAppLayout>
  )
}
