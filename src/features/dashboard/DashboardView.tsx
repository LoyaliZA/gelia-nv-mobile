import { Icon } from '../../components/ui/Icon'

interface DashboardViewProps { onOpenClients: () => void }

export function DashboardView({ onOpenClients }: DashboardViewProps) {
  return (
    <div className="page-stack">
      <header className="page-heading"><span className="eyebrow">PANEL MÓVIL_</span><h1>Operación en tienda</h1><p>Accede rápidamente a las herramientas disponibles para tu usuario.</p></header>
      <button className="feature-card" onClick={onOpenClients}>
        <span className="feature-icon"><Icon name="users" /></span>
        <span className="feature-copy"><strong>Consultar cliente</strong><small>Verifica identidad y datos por número de cliente.</small></span>
        <Icon className="feature-arrow" name="chevron" />
      </button>
      <section className="sync-card"><div><Icon name="refresh" /></div><span><strong>Sincronización</strong><small>La descarga local de clientes se añadirá en la siguiente fase.</small></span><b>Pendiente</b></section>
    </div>
  )
}
