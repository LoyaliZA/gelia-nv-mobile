import { Icon } from '../../components/ui/Icon'
import { useClienteSync } from '../clientes/useClienteSync'

interface DashboardViewProps { onOpenClients: () => void }

export function DashboardView({ onOpenClients }: DashboardViewProps) {
  const { state, syncNow } = useClienteSync()
  const syncing = state.phase === 'bootstrapping' || state.phase === 'incremental'
  const status = state.phase === 'ready' ? 'Listo' : state.phase === 'offline' ? 'Offline' : state.phase === 'error' ? 'Reintentar' : 'Sincronizando'
  const detail = state.phase === 'bootstrapping'
    ? `${state.downloaded}${state.total !== null ? ` de ${state.total}` : ''} clientes descargados`
    : state.phase === 'incremental'
      ? 'Aplicando cambios recientes…'
      : state.phase === 'ready'
        ? `${state.downloaded} clientes disponibles sin conexión.`
        : state.error || 'La sincronización continuará al recuperar conexión.'
  return (
    <div className="page-stack">
      <header className="page-heading"><span className="eyebrow">PANEL MÓVIL_</span><h1>Operación en tienda</h1><p>Accede rápidamente a las herramientas disponibles para tu usuario.</p></header>
      <button className="feature-card" onClick={onOpenClients}>
        <span className="feature-icon"><Icon name="users" /></span>
        <span className="feature-copy"><strong>Consultar cliente</strong><small>Verifica identidad y datos por número de cliente.</small></span>
        <Icon className="feature-arrow" name="chevron" />
      </button>
      <button className="sync-card" disabled={syncing} onClick={() => { void syncNow() }} type="button">
        <div className={syncing ? 'sync-icon--active' : ''}><Icon name="refresh" /></div>
        <span><strong>Sincronización</strong><small>{detail}</small></span>
        <b className={`sync-status sync-status--${state.phase}`}>{status}</b>
      </button>
    </div>
  )
}
