import { Moon, Sun } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { PasskeysPanel } from '../../components/profile/PasskeysPanel'
import { ApiError } from '../../lib/api/apiClient'
import { ACCENT_COLORS } from '../../theme/applyGeliaTheme'
import { clearThemeOverride } from '../../hooks/useThemeToggle'
import type { MobileSession, TemaVisual } from '../auth/auth.types'
import { updateMobileTemaVisual } from './profile.api'

interface PreferenciasViewProps {
  onSessionUpdate: (session: MobileSession) => void
  session: MobileSession
}

const COLOR_OPTIONS = Object.keys(ACCENT_COLORS)

export function PreferenciasView({ onSessionUpdate, session }: PreferenciasViewProps) {
  const tema = session.temaVisual
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const colorActual = String(tema.color_nombre || 'rosa').toLowerCase()
  const modoActual = tema.modo === 'light' ? 'light' : 'dark'

  const guardarTema = async (cambios: Partial<TemaVisual>) => {
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const actualizado = await updateMobileTemaVisual(session, cambios)
      if (cambios.modo) {
        await clearThemeOverride()
      }
      onSessionUpdate(actualizado)
      setMensaje('Preferencias guardadas.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron guardar las preferencias.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">PERSONALIZACIÓN_</span>
        <h1>Preferencias</h1>
      </header>

      <section className="profile-card preferences-card">
        <h2>Apariencia</h2>
        <p>El color y el modo se sincronizan con tu cuenta de GELIA en web y móvil.</p>

        <div className="preferences-group">
          <span className="preferences-label">Color principal</span>
          <div className="preferences-colors" role="list">
            {COLOR_OPTIONS.map((color) => {
              const activo = colorActual === color
              return (
                <button
                  aria-label={`Color ${color}`}
                  aria-pressed={activo}
                  className={`preferences-color${activo ? ' preferences-color--active' : ''}`}
                  disabled={guardando}
                  key={color}
                  onClick={() => void guardarTema({ color_nombre: color, color_hex: ACCENT_COLORS[color] })}
                  style={{ '--swatch-color': ACCENT_COLORS[color] } as CSSProperties}
                  type="button"
                >
                  <span />
                </button>
              )
            })}
          </div>
        </div>

        <div className="preferences-group">
          <span className="preferences-label">Modo</span>
          <div className="preferences-mode">
            <button
              aria-pressed={modoActual === 'dark'}
              className={`preferences-mode-btn${modoActual === 'dark' ? ' preferences-mode-btn--active' : ''}`}
              disabled={guardando}
              onClick={() => void guardarTema({ modo: 'dark' })}
              type="button"
            >
              <Moon size={16} />
              Oscuro
            </button>
            <button
              aria-pressed={modoActual === 'light'}
              className={`preferences-mode-btn${modoActual === 'light' ? ' preferences-mode-btn--active' : ''}`}
              disabled={guardando}
              onClick={() => void guardarTema({ modo: 'light' })}
              type="button"
            >
              <Sun size={16} />
              Claro
            </button>
          </div>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        {mensaje && <p className="passkey-success">{mensaje}</p>}
        {guardando && <p className="preferences-saving">Guardando cambios…</p>}
      </section>

      <PasskeysPanel session={session} />
    </div>
  )
}
