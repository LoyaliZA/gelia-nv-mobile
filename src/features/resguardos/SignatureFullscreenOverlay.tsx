import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Check, RotateCw, Smartphone, X } from 'lucide-react'
import { ModalPortal } from '../../components/ui/ModalPortal'
import { SignaturePad } from './SignaturePad'
import type { SignaturePadHandle } from './SignaturePad'
import { esDispositivoCampo, normalizarDataUrlFirma } from './entregaResguardoFirma'

const ALTURA_BARRA = 120

async function bloquearOrientacionHorizontal() {
  if (!esDispositivoCampo()) return
  try {
    await screen.orientation?.lock?.('landscape')
  } catch {
    // En iOS/Safari el lock puede requerir gesto o pantalla completa nativa.
  }
}

function liberarOrientacion() {
  try {
    screen.orientation?.unlock?.()
  } catch {
    // Sin efecto en navegadores que no soportan unlock.
  }
}

interface Props {
  open: boolean
  initialDataUrl?: string | null
  disabled?: boolean
  onSave: (dataUrl: string) => void | Promise<void>
  onClose: () => void
}

export function SignatureFullscreenOverlay({
  open,
  initialDataUrl = null,
  disabled = false,
  onSave,
  onClose,
}: Props) {
  const signatureRef = useRef<SignaturePadHandle | null>(null)
  const [canvasHeight, setCanvasHeight] = useState(280)
  const [portrait, setPortrait] = useState(false)
  const [saving, setSaving] = useState(false)
  const requiereHorizontal = esDispositivoCampo()

  const actualizarLayout = useCallback(() => {
    setPortrait(window.matchMedia?.('(orientation: portrait)')?.matches ?? false)
    const disponible = Math.max(200, window.innerHeight - ALTURA_BARRA)
    setCanvasHeight(disponible)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    actualizarLayout()
    document.body.style.overflow = 'hidden'
    void bloquearOrientacionHorizontal()

    window.addEventListener('resize', actualizarLayout)
    const orientacion = window.matchMedia?.('(orientation: portrait)')
    orientacion?.addEventListener?.('change', actualizarLayout)

    return () => {
      document.body.style.overflow = ''
      liberarOrientacion()
      window.removeEventListener('resize', actualizarLayout)
      orientacion?.removeEventListener?.('change', actualizarLayout)
    }
  }, [open, actualizarLayout])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      if (initialDataUrl) {
        signatureRef.current?.loadDataUrl(initialDataUrl)
      }
    }, 50)
    return () => window.clearTimeout(timer)
  }, [open, initialDataUrl])

  const cerrar = () => {
    if (saving || disabled) return
    onClose()
  }

  const guardar = async () => {
    if (disabled || saving) return
    if (requiereHorizontal && portrait) return
    if (!signatureRef.current?.hasSignature()) return

    setSaving(true)
    try {
      const captura = signatureRef.current.getDataUrl()
      if (!captura) return
      const normalizada = await normalizarDataUrlFirma(captura)
      if (!normalizada) return
      await onSave(normalizada)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const bloqueadoPorOrientacion = requiereHorizontal && portrait

  return (
    <ModalPortal lockScroll>
      <div
        className="pdv-signature-fullscreen"
        role="dialog"
        aria-modal="true"
        aria-label="Firma en pantalla completa"
      >
        <header className="pdv-signature-fullscreen__header">
          <div className="pdv-signature-fullscreen__titles">
            <strong>Firma del receptor</strong>
            <p>Usa todo el ancho de la pantalla. Al guardar se ajustará al recuadro del formulario.</p>
          </div>
          <button
            aria-label="Cerrar"
            className="pdv-icon-button"
            disabled={disabled || saving}
            onClick={cerrar}
            type="button"
          >
            <X size={19} />
          </button>
        </header>

        <div className="pdv-signature-fullscreen__body">
          {bloqueadoPorOrientacion ? (
            <div className="pdv-signature-fullscreen__rotate-hint">
              <Smartphone className="pdv-signature-fullscreen__rotate-icon" size={48} />
              <strong>Gira el dispositivo en horizontal</strong>
              <p>
                En teléfono o tablet la firma se captura en orientación horizontal para aprovechar el ancho de la pantalla.
              </p>
              <RotateCw className="pdv-signature-fullscreen__rotate-pulse" size={32} />
            </div>
          ) : (
            <SignaturePad
              ref={signatureRef}
              canvasHeight={canvasHeight}
              className="pdv-signature--fullscreen"
              showFooter={true}
            />
          )}
        </div>

        <footer className="pdv-signature-fullscreen__footer">
          <button
            className="secondary-button"
            disabled={disabled || saving}
            onClick={cerrar}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={disabled || saving || bloqueadoPorOrientacion}
            onClick={() => void guardar()}
            type="button"
          >
            <Check size={16} />
            {saving ? 'Guardando…' : 'Guardar firma'}
          </button>
        </footer>
      </div>
    </ModalPortal>
  )
}
