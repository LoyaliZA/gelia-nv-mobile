import { Layers, Search } from 'lucide-react'
import type { AppRoute } from '../../app/routes'
import { DashboardMobileView } from '../../components/dashboard/DashboardMobileView'
import { DashboardModuleCard } from '../../components/dashboard/DashboardModuleCard'
import { DashboardPanel } from '../../components/dashboard/DashboardPanel'

interface DashboardViewProps {
  onNavigate: (route: AppRoute) => void
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const sections = [
    {
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
    },
  ]

  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">PANEL MÓVIL_</span>
        <h1>Panel Principal</h1>
        <p>Accede a las herramientas operativas disponibles en la app móvil.</p>
      </header>
      <DashboardMobileView sections={sections} />
    </div>
  )
}
