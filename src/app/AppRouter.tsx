import { GeliaLogo } from '../components/ui/GeliaLogo'
import { DashboardView } from '../features/dashboard/DashboardView'
import { LoginView } from '../features/auth/LoginView'
import { useAuth } from '../features/auth/useAuth'
import { ClienteAccessDeniedView } from '../features/clientes/ClienteAccessDeniedView'
import { ClienteBusquedaView } from '../features/clientes/ClienteBusquedaView'
import { ClienteSyncProvider } from '../features/clientes/ClienteSyncProvider'
import { puedeConsultarClientesMovil } from '../features/clientes/mobileClienteAccess'
import { PerfilView } from '../features/profile/PerfilView'
import { PreferenciasView } from '../features/profile/PreferenciasView'
import { PuntoVentaAccessDeniedView } from '../features/puntoVenta/PuntoVentaAccessDeniedView'
import { PuntoVentaProvider } from '../features/puntoVenta/PuntoVentaProvider'
import {
  puedeAbrirRecepcionTurnosMovil,
  puedeVerResguardosMovil,
  puedeVerVisitasProgramadasMovil,
} from '../features/puntoVenta/puntoVentaAccess'
import { ResguardosView } from '../features/resguardos/ResguardosView'
import { TurnosRecepcionView } from '../features/turnos/TurnosRecepcionView'
import { VisitasDelDiaView } from '../features/visitas/VisitasDelDiaView'
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

  const canConsultarClientes = puedeConsultarClientesMovil(auth.session.permissions)
  const canResguardos = puedeVerResguardosMovil(auth.session.permissions)
  const canTurnos = puedeAbrirRecepcionTurnosMovil(auth.session.permissions)
  const canVisitas = puedeVerVisitasProgramadasMovil(auth.session.permissions)

  return (
    <ClienteSyncProvider session={auth.session}>
      <PuntoVentaProvider session={auth.session}>
        <MobileAppLayout
          activeRoute={route}
          onNavigate={navigate}
          onLogout={auth.logout}
          session={auth.session}
          temaVisual={auth.session.temaVisual}
          user={auth.session.user}
        >
          {route === 'inicio' && <DashboardView onNavigate={navigate} session={auth.session} />}

          {route === 'clientes' && (
            canConsultarClientes
              ? <ClienteBusquedaView />
              : <ClienteAccessDeniedView onGoHome={() => navigate('inicio')} />
          )}

          {route === 'resguardos' && (
            canResguardos
              ? <ResguardosView session={auth.session} />
              : <PuntoVentaAccessDeniedView modulo="Resguardos" onNavigate={navigate} />
          )}

          {route === 'turnos' && (
            canTurnos
              ? <TurnosRecepcionView session={auth.session} />
              : <PuntoVentaAccessDeniedView modulo="Recepción de Turnos" onNavigate={navigate} />
          )}

          {route === 'visitas' && (
            canVisitas
              ? <VisitasDelDiaView session={auth.session} />
              : <PuntoVentaAccessDeniedView modulo="Visitas del día" onNavigate={navigate} />
          )}

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
      </PuntoVentaProvider>
    </ClienteSyncProvider>
  )
}
