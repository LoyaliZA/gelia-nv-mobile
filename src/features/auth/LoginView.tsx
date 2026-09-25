import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { GeliaLogo } from '../../components/ui/GeliaLogo'
import { Icon } from '../../components/ui/Icon'
import { ApiError } from '../../lib/api/apiClient'
import { passkeyLoginOptions } from './auth.api'
import { usePasskeyDisponible } from './usePasskeyDisponible'
import type { LoginCredentials } from './auth.types'

interface LoginViewProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>
  onLoginWithPasskey: (login: string) => Promise<void>
}

export function LoginView({ onLogin, onLoginWithPasskey }: LoginViewProps) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [passkeySubmitting, setPasskeySubmitting] = useState(false)
  const [mostrarHuella, setMostrarHuella] = useState(false)
  const { disponible: passkeyDisponible, evaluando: evaluandoPasskey } = usePasskeyDisponible()

  useEffect(() => {
    if (!passkeyDisponible || evaluandoPasskey || login.trim().length < 3) {
      setMostrarHuella(false)
      return
    }
    const timeout = window.setTimeout(() => {
      void passkeyLoginOptions(login.trim())
        .then((options) => setMostrarHuella((options.allowCredentials?.length ?? 0) > 0))
        .catch(() => setMostrarHuella(false))
    }, 400)
    return () => window.clearTimeout(timeout)
  }, [evaluandoPasskey, login, passkeyDisponible])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!login.trim() || !password) return
    setSubmitting(true)
    setError('')
    try {
      await onLogin({ login: login.trim(), password })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasskey = async () => {
    if (!login.trim()) return
    setPasskeySubmitting(true)
    setError('')
    try {
      await onLoginWithPasskey(login.trim())
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible entrar con huella.')
    } finally {
      setPasskeySubmitting(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-hero">
        <div className="brand-lockup">
          <GeliaLogo className="gelia-logo--brand" variant="sparkle" />
          <div><span className="eyebrow">GELIA-NV</span><strong>1.0.0</strong></div>
        </div>
        <div className="login-message">
          <span className="security-chip"><Icon name="shield" /> Acceso protegido</span>
          <h1>Tu operación,<br /><em>siempre contigo.</em></h1>
          <p>Ingresa a tu cuenta de GELIA-NV para ver tus operaciones y validar tu información.</p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <header>
            <span className="eyebrow">BIENVENIDO DE NUEVO_</span>
            <h2>Iniciar sesión</h2>
            <p>Ingresa tus credenciales de GELIA-NV.</p>
          </header>
          <form onSubmit={handleSubmit}>
            <label>Usuario o correo
              <input autoCapitalize="none" autoComplete="username" onChange={(event) => setLogin(event.target.value)} placeholder="usuario@empresa.com" value={login} />
            </label>
            <label>Contraseña
              <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" type="password" value={password} />
            </label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="primary-button" disabled={submitting || !login.trim() || !password} type="submit">
              <span>{submitting ? 'Verificando…' : 'Entrar a GELIA'}</span>
              <Icon className={submitting ? 'spin' : ''} name={submitting ? 'refresh' : 'arrow'} />
            </button>
            {mostrarHuella && (
              <button className="secondary-button passkey-button" disabled={passkeySubmitting || submitting} onClick={() => void handlePasskey()} type="button">
                <Icon name="fingerprint" />
                <span>{passkeySubmitting ? 'Esperando huella…' : 'Entrar con huella'}</span>
              </button>
            )}
          </form>
          <footer><Icon name="shield" /><span>La contraseña se valida en GELIA y no se guarda en este dispositivo.</span></footer>
        </div>
      </section>
    </main>
  )
}
