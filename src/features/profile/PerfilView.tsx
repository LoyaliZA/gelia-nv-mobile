import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { ApiError } from '../../lib/api/apiClient'
import { listPasskeys, registerPasskey, revokePasskey, webAuthnSoportado } from '../auth/auth.api'
import type { MobileSession, PasskeyCredentialSummary } from '../auth/auth.types'

interface PerfilViewProps { session: MobileSession; onLogout: () => Promise<void> }

export function PerfilView({ session, onLogout }: PerfilViewProps) {
  const [passkeys, setPasskeys] = useState<PasskeyCredentialSummary[]>([])
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(false)
  const soportado = webAuthnSoportado()

  useEffect(() => {
    void listPasskeys(session)
      .then(setPasskeys)
      .catch(() => setPasskeys([]))
  }, [session])

  const registrar = async () => {
    setProcesando(true)
    setError('')
    setMensaje('')
    try {
      await registerPasskey(session, `Huella ${session.device.nombre || 'móvil'}`)
      setPasskeys(await listPasskeys(session))
      setMensaje('Passkey registrada. El próximo acceso puede usar huella.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo registrar la passkey. Si el WebView no admite WebAuthn, usa contraseña.')
    } finally {
      setProcesando(false)
    }
  }

  const revocar = async (id: string) => {
    setProcesando(true)
    setError('')
    try {
      await revokePasskey(session, id)
      setPasskeys(await listPasskeys(session))
      setMensaje('Passkey revocada.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo revocar la passkey.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="page-stack">
      <header className="page-heading"><span className="eyebrow">CUENTA GELIA_</span><h1>Mi perfil</h1></header>
      <section className="profile-card">
        <div className="profile-avatar">{session.user.name.charAt(0).toUpperCase()}</div>
        <h2>{session.user.name}</h2>
        <p>{session.user.email || session.user.username}</p>
        <div className="profile-meta"><span>Dispositivo</span><strong>{session.device.nombre || 'GELIA Móvil'}</strong></div>
        <div className="profile-meta"><span>Permisos móviles</span><strong>{session.permissions.length}</strong></div>
      </section>

      <section className="profile-card passkeys-card">
        <h2>Acceso con huella</h2>
        <p>Registra o revoca passkeys de este usuario. Cerrar sesión no elimina la passkey.</p>
        {soportado ? (
          <button className="secondary-button passkey-button" disabled={procesando} onClick={() => void registrar()} type="button">
            <Icon name="fingerprint" />
            <span>{procesando ? 'Esperando huella…' : 'Registrar huella en este dispositivo'}</span>
          </button>
        ) : (
          <p>Este WebView no expone WebAuthn. El acceso sigue siendo con usuario y contraseña.</p>
        )}
        {error && <div className="form-error" role="alert">{error}</div>}
        {mensaje && <p className="passkey-success">{mensaje}</p>}
        {passkeys.length > 0 && (
          <ul className="passkey-list">
            {passkeys.map((passkey) => (
              <li key={passkey.id}>
                <div>
                  <strong>{passkey.nickname || 'Passkey'}</strong>
                  <small>{passkey.platform || 'dispositivo'}</small>
                </div>
                <button className="logout-button passkey-revoke" disabled={procesando} onClick={() => void revocar(passkey.id)} type="button">
                  Revocar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button className="logout-button" onClick={() => void onLogout()}><Icon name="logout" /> Cerrar sesión</button>
    </div>
  )
}
