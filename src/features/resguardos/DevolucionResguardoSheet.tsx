import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Camera, LoaderCircle, X } from 'lucide-react'
import type { MobileSession } from '../auth/auth.types'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { ModalPortal } from '../../components/ui/ModalPortal'
import { confirmarDevolucionResguardo } from './resguardo.api'
import { prepararArchivoEvidencia } from './captureEvidencePhoto'

interface Props {
  open: boolean
  resguardoId: number
  version: number
  session: MobileSession
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

export function DevolucionResguardoSheet({
  open,
  resguardoId,
  version,
  session,
  onClose,
  onSuccess,
}: Props) {
  const archivoRef = useRef<HTMLInputElement | null>(null)
  const [motivo, setMotivo] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const onFoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setFoto(await prepararArchivoEvidencia(file, 'devolucion'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen.')
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (enviando) return
    setEnviando(true)
    setError(null)
    try {
      await confirmarDevolucionResguardo(session, resguardoId, version, motivo, foto ? [foto] : [])
      setMotivo('')
      setFoto(null)
      await onSuccess()
      onClose()
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo confirmar la devolución.'))
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
              <span className="pdv-kicker">Devolución</span>
              <h2>Regresar al origen</h2>
            </div>
            <button aria-label="Cerrar" className="pdv-icon-button" disabled={enviando} onClick={onClose} type="button">
              <X size={19} />
            </button>
          </header>
          <form className="pdv-form" onSubmit={(event) => void submit(event)}>
            <p className="pdv-muted">Los bultos recibidos salen de custodia y el resguardo queda devuelto.</p>
            <label>
              Motivo
              <textarea maxLength={1000} onChange={(event) => setMotivo(event.target.value)} required rows={4} value={motivo} />
            </label>
            <button className="secondary-button" onClick={() => archivoRef.current?.click()} type="button">
              <Camera size={16} /> {foto ? 'Cambiar foto' : 'Foto opcional'}
            </button>
            <input accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void onFoto(event)} ref={archivoRef} type="file" />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" disabled={enviando} type="submit">
              {enviando ? <LoaderCircle className="spin" /> : 'Confirmar devolución'}
            </button>
          </form>
        </section>
      </div>
    </ModalPortal>
  )
}
