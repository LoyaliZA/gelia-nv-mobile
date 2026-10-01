import { useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import type { MobileSession } from '../auth/auth.types'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { ModalPortal } from '../../components/ui/ModalPortal'
import { reponerVencidoResguardo } from './resguardo.api'

interface Props {
  open: boolean
  resguardoId: number
  version: number
  session: MobileSession
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

export function ReponerVencidoSheet({
  open,
  resguardoId,
  version,
  session,
  onClose,
  onSuccess,
}: Props) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (enviando) return
    setEnviando(true)
    setError(null)
    try {
      await reponerVencidoResguardo(session, resguardoId, version, motivo)
      setMotivo('')
      await onSuccess()
      onClose()
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo reponer el resguardo vencido.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <ModalPortal>
      <div className="pdv-overlay pdv-overlay--stacked" role="presentation">
        <section aria-modal="true" className="pdv-sheet pdv-sheet--dialog" role="dialog">
          <header className="pdv-sheet__header">
            <div>
              <span className="pdv-kicker">Custodia vencida</span>
              <h2>Reponer plazo</h2>
            </div>
            <button aria-label="Cerrar" className="pdv-icon-button" disabled={enviando} onClick={onClose} type="button">
              <X size={19} />
            </button>
          </header>
          <form className="pdv-form" onSubmit={(event) => void submit(event)}>
            <label>
              Motivo
              <textarea maxLength={1000} onChange={(event) => setMotivo(event.target.value)} required rows={4} value={motivo} />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" disabled={enviando} type="submit">
              {enviando ? <LoaderCircle className="spin" /> : 'Reponer vencido'}
            </button>
          </form>
        </section>
      </div>
    </ModalPortal>
  )
}
