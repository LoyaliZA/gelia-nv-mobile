import { Icon } from '../../components/ui/Icon'
import type { MobileSession } from '../auth/auth.types'

interface PerfilViewProps { session: MobileSession; onLogout: () => Promise<void> }

export function PerfilView({ session, onLogout }: PerfilViewProps) {
  return (
    <div className="page-stack">
      <header className="page-heading"><span className="eyebrow">CUENTA GELIA_</span><h1>Mi perfil</h1></header>
      <section className="profile-card">
        <div className="profile-avatar">{session.user.name.charAt(0).toUpperCase()}</div><h2>{session.user.name}</h2><p>{session.user.email || session.user.username}</p>
        <div className="profile-meta"><span>Dispositivo</span><strong>{session.device.nombre || 'GELIA Móvil'}</strong></div>
        <div className="profile-meta"><span>Permisos móviles</span><strong>{session.permissions.length}</strong></div>
      </section>
      <button className="logout-button" onClick={() => void onLogout()}><Icon name="logout" /> Cerrar sesión</button>
    </div>
  )
}
