import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { ApiError } from '../../lib/api/apiClient'
import { listPasskeys, registerPasskey, revokePasskey, webAuthnSoportado } from '../../features/auth/auth.api'
import type { MobileSession, PasskeyCredentialSummary } from '../../features/auth/auth.types'

interface PasskeysPanelProps {
  session: MobileSession
}

function formatAccessDate(value: string | null) {
  if (!value) return 'Sin uso registrado'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function PasskeysPanel({ session }: PasskeysPanelProps) {
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
      setMensaje('Huella registrada. El próximo acceso puede usar biometría.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo registrar la huella en este dispositivo.')
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
      setMensaje('Registro de acceso revocado.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo revocar el registro.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <section className="profile-card passkeys-card">
      <h2>Registros de acceso</h2>
      <p>Administra las huellas o passkeys autorizadas para entrar a GELIA desde este usuario.</p>
      {soportado ? (
        <button className="secondary-button passkey-button" disabled={procesando} onClick={() => void registrar()} type="button">
          <Icon name="fingerprint" />
          <span>{procesando ? 'Esperando huella…' : 'Registrar huella en este dispositivo'}</span>
        </button>
      ) : (
        <p>Este dispositivo no expone WebAuthn. El acceso sigue siendo con usuario y contraseña.</p>
      )}
      {error && <div className="form-error" role="alert">{error}</div>}
      {mensaje && <p className="passkey-success">{mensaje}</p>}
      {passkeys.length > 0 && (
        <ul className="passkey-list">
          {passkeys.map((passkey) => (
            <li key={passkey.id}>
              <div>
                <strong>{passkey.nickname || 'Huella registrada'}</strong>
                <small>{passkey.platform || 'dispositivo'} · {formatAccessDate(passkey.last_used_at)}</small>
              </div>
              <button className="logout-button passkey-revoke" disabled={procesando} onClick={() => void revocar(passkey.id)} type="button">
                Revocar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
