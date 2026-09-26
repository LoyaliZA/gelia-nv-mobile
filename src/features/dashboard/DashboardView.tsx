import { Layers, Search } from 'lucide-react'
import type { AppRoute } from '../../app/routes'
import { DashboardMobileView } from '../../components/dashboard/DashboardMobileView'
import { DashboardModuleCard } from '../../components/dashboard/DashboardModuleCard'
import { DashboardPanel } from '../../components/dashboard/DashboardPanel'
import type { MobileSession } from '../auth/auth.types'
import { ClienteSyncStatus } from '../clientes/ClienteSyncStatus'
import { puedeConsultarClientesMovil } from '../clientes/mobileClienteAccess'

interface DashboardViewProps {
  onNavigate: (route: AppRoute) => void
  session: MobileSession
}

export function DashboardView({ onNavigate, session }: DashboardViewProps) {
  const showClientes = puedeConsultarClientesMovil(session.permissions)

  const sections = [
    ...(showClientes ? [{
      id: 'operaciones',
      content: (
        <DashboardPanel icon={Layers} title="Funciones Operativas_">
          <div className="dashboard-panel-cards__grid dashboard-panel-cards__grid--single">
            <DashboardModuleCard
              borderStyle={{ borderColor: 'var(--color-primario)' }}
              icon={Search}
              iconStyle={{ color: 'var(--color-primario)' }}
              iconWrapStyle={{ backgroundColor: 'color-mix(in srgb, var(--color-primario) 15%, transparent)' }}
              onClick={() => onNavigate('clientes')}
              subtitle="Verifica identidad y datos por número de cliente."
              title="Consultar Clientes"
            />
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
