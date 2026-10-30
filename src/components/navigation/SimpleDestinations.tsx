import { CalendarClock, Search } from 'lucide-react'
import type { AppRoute } from '../../app/routes'
import { puedeConsultarClientesMovil } from '../../features/clientes/mobileClienteAccess'
import { puedeVerVisitasProgramadasMovil } from '../../features/puntoVenta/puntoVentaAccess'

interface SimpleDestinationsProps {
  activeRoute?: AppRoute
  onNavigate: (route: AppRoute) => void
  permissions: string[]
}

export function SimpleDestinations({ activeRoute, onNavigate, permissions }: SimpleDestinationsProps) {
  const clientes = puedeConsultarClientesMovil(permissions)
  const visitas = puedeVerVisitasProgramadasMovil(permissions)

  return (
    <div className="simple-destinations">
      {clientes && (
        <button
          className={`simple-destination${activeRoute === 'clientes' ? ' simple-destination--active' : ''}`}
          onClick={() => onNavigate('clientes')}
          type="button"
        >
          <Search size={28} />
          <span>
            <strong>Consultar clientes</strong>
            <small>Busca por número o por nombre.</small>
          </span>
        </button>
      )}
      {visitas && (
        <button
          className={`simple-destination${activeRoute === 'visitas' ? ' simple-destination--active' : ''}`}
          onClick={() => onNavigate('visitas')}
          type="button"
        >
          <CalendarClock size={28} />
          <span>
            <strong>Visitas del día</strong>
            <small>Consulta las visitas programadas.</small>
          </span>
        </button>
      )}
    </div>
  )
}
