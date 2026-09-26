import { ShieldOff } from 'lucide-react'
import { MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE } from './mobileClienteAccess'

interface Props {
  onGoHome: () => void
}

export function ClienteAccessDeniedView({ onGoHome }: Props) {
  return (
    <div className="page-stack">
      <section className="empty-result" aria-live="polite">
        <div className="empty-icon"><ShieldOff size={28} /></div>
        <h2>Consulta de clientes no disponible</h2>
        <p>{MOBILE_CLIENTE_ACCESS_DENIED_MESSAGE}</p>
        <button className="secondary-button" onClick={onGoHome} type="button">
          Volver al panel principal
        </button>
      </section>
    </div>
  )
}
