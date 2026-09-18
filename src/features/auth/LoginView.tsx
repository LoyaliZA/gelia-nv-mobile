import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../components/ui/Icon'
import { ApiError } from '../../lib/api/apiClient'
import type { LoginCredentials } from './auth.types'

interface LoginViewProps { onLogin: (credentials: LoginCredentials) => Promise<void> }

export function LoginView({ onLogin }: LoginViewProps) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  return (
    <main className="login-screen">
      <section className="login-hero">
        <div className="brand-lockup">
          <div className="gelia-mark">G</div>
          <div><span className="eyebrow">GELIA-NV</span><strong>Operación móvil</strong></div>
        </div>
        <div className="login-message">
          <span className="security-chip"><Icon name="shield" /> Acceso protegido</span>
          <h1>Tu operación,<br /><em>siempre contigo.</em></h1>
          <p>Consulta clientes y valida su información directamente con tu cuenta de GELIA.</p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <header>
            <span className="eyebrow">BIENVENIDO DE NUEVO_</span>
            <h2>Iniciar sesión</h2>
            <p>Utiliza las mismas credenciales de GELIA-NV.</p>
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
          </form>
          <footer><Icon name="shield" /><span>La contraseña se valida en GELIA y no se guarda en este dispositivo.</span></footer>
        </div>
      </section>
    </main>
  )
}
