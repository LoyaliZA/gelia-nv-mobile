import { Briefcase, CalendarClock, Package, Search, Store, Ticket } from 'lucide-react'
import type { AppRoute } from '../../app/routes'
import { DashboardMobileView } from '../../components/dashboard/DashboardMobileView'
import { DashboardModuleCard } from '../../components/dashboard/DashboardModuleCard'
import { DashboardPanel } from '../../components/dashboard/DashboardPanel'
import type { MobileSession } from '../auth/auth.types'
import { ClienteSyncStatus } from '../clientes/ClienteSyncStatus'
import { puedeConsultarClientesMovil } from '../clientes/mobileClienteAccess'
import {
  puedeAbrirRecepcionTurnosMovil,
  puedeVerResguardosMovil,
  puedeVerVisitasProgramadasMovil,
} from '../puntoVenta/puntoVentaAccess'

interface DashboardViewProps {
  onNavigate: (route: AppRoute) => void
  session: MobileSession
}

export function DashboardView({ onNavigate, session }: DashboardViewProps) {
  const showClientes = puedeConsultarClientesMovil(session.permissions)
  const showResguardos = puedeVerResguardosMovil(session.permissions)
  const showTurnos = puedeAbrirRecepcionTurnosMovil(session.permissions)
  const showVisitas = puedeVerVisitasProgramadasMovil(session.permissions)
  const hasPuntoVenta = showResguardos || showTurnos || showVisitas

  const sections = [
    ...(showClientes ? [{
      id: 'operaciones',
      content: (
        <DashboardPanel icon={Briefcase} title="Operaciones_">
          <div className="dashboard-panel-cards__grid">
            <DashboardModuleCard
              borderStyle={{ borderColor: 'var(--color-primario)' }}
              icon={Search}
              iconStyle={{ color: 'var(--color-primario)' }}
              iconWrapStyle={{ backgroundColor: 'color-mix(in srgb, var(--color-primario) 15%, transparent)' }}
              onClick={() => onNavigate('clientes')}
              subtitle="Verifica identidad y datos por número o nombre."
              title="Consultar Clientes"
            />
          </div>
        </DashboardPanel>
      ),
    }] : []),
    ...(hasPuntoVenta ? [{
      id: 'punto_venta',
      content: (
        <DashboardPanel icon={Store} title="Punto de venta_">
          <div className="dashboard-panel-cards__grid">
            {showResguardos && (
              <DashboardModuleCard
                borderStyle={{ borderColor: 'var(--color-primario)' }}
                icon={Package}
                iconStyle={{ color: 'var(--color-primario)' }}
                iconWrapStyle={{ backgroundColor: 'color-mix(in srgb, var(--color-primario) 15%, transparent)' }}
                onClick={() => onNavigate('resguardos')}
                subtitle="Recepción, custodia, detalle y entrega."
                title="Resguardos"
              />
            )}

            {showTurnos && (
              <DashboardModuleCard
                borderStyle={{ borderColor: 'var(--color-primario)' }}
                icon={Ticket}
                iconStyle={{ color: 'var(--color-primario)' }}
                iconWrapStyle={{ backgroundColor: 'color-mix(in srgb, var(--color-primario) 15%, transparent)' }}
                onClick={() => onNavigate('turnos')}
                subtitle="Alta y seguimiento de la fila de ventas."
                title="Recepción turnos"
              />
            )}

            {showVisitas && (
              <DashboardModuleCard
                borderStyle={{ borderColor: 'var(--color-primario)' }}
                icon={CalendarClock}
                iconStyle={{ color: 'var(--color-primario)' }}
                iconWrapStyle={{ backgroundColor: 'color-mix(in srgb, var(--color-primario) 15%, transparent)' }}
                onClick={() => onNavigate('visitas')}
                subtitle="Visitas programadas para hoy en sucursal."
                title="Visitas del día"
              />
            )}
          </div>
        </DashboardPanel>
      ),
    }] : []),
  ]

  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">PANEL MÓVIL_</span>
        <h1>Panel Principal</h1>
        <p>Accede a las herramientas operativas disponibles en la app móvil.</p>
        {showClientes ? <ClienteSyncStatus compact /> : null}
      </header>

      {sections.length > 0 ? (
        <DashboardMobileView sections={sections} />
      ) : (
        <section className="lookup-card lookup-hint-only">
          <p>No hay módulos operativos habilitados para tu cuenta en la app móvil.</p>
        </section>
      )}
    </div>
  )
}
