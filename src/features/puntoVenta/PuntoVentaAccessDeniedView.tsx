import { ShieldX } from 'lucide-react'
import type { AppRoute } from '../../app/routes'

interface Props {
  modulo: string
  onNavigate: (route: AppRoute) => void
}

export function PuntoVentaAccessDeniedView({ modulo, onNavigate }: Props) {
  return (
    <div className="page-stack">
      <section className="empty-result">
        <div className="empty-icon"><ShieldX /></div>
        <h2>Acceso no disponible</h2>
        <p>Tu cuenta no tiene permiso para usar {modulo} desde la app móvil.</p>
        <button className="secondary-button" onClick={() => onNavigate('inicio')} type="button">
          Volver al inicio
        </button>
      </section>
    </div>
  )
}
