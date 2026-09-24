import { GeliaLogo } from '../components/ui/GeliaLogo'
import { DashboardView } from '../features/dashboard/DashboardView'
import { LoginView } from '../features/auth/LoginView'
import { useAuth } from '../features/auth/useAuth'
import { ClienteBusquedaView } from '../features/clientes/ClienteBusquedaView'
import { ClienteSyncProvider } from '../features/clientes/ClienteSyncProvider'
import { PerfilView } from '../features/profile/PerfilView'
import { PreferenciasView } from '../features/profile/PreferenciasView'
import { MobileAppLayout } from '../layouts/MobileAppLayout'
import { useAppRoute } from './routes'

export function AppRouter() {
  const auth = useAuth()
  const { route, navigate } = useAppRoute()

  if (auth.status === 'booting') {
    return (
      <main className="splash-screen" aria-live="polite">
        <GeliaLogo className="gelia-logo--splash" variant="fluid-fill" />
        <div className="splash-pulse" />
        <p>Validando sesión segura…</p>
      </main>
    )
  }

  if (auth.status === 'guest') {
    return <LoginView onLogin={auth.login} onLoginWithPasskey={auth.loginWithPasskey} />
  }

  return (
    <ClienteSyncProvider session={auth.session}>
      <MobileAppLayout
        activeRoute={route}
        onNavigate={navigate}
        onLogout={auth.logout}
        temaVisual={auth.session.temaVisual}
        user={auth.session.user}
      >
        {route === 'inicio' && <DashboardView onNavigate={navigate} />}
        {route === 'clientes' && <ClienteBusquedaView />}
        {route === 'perfil' && (
          <PerfilView
            onLogout={auth.logout}
            onSessionUpdate={auth.updateSession}
            session={auth.session}
          />
        )}
        {route === 'preferencias' && (
          <PreferenciasView
            onSessionUpdate={auth.updateSession}
            session={auth.session}
          />
        )}
      </MobileAppLayout>
    </ClienteSyncProvider>
  )
}
