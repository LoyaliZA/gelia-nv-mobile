import { Camera, Flashlight, FlashlightOff, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import type { Html5Qrcode as Html5QrcodeType } from 'html5-qrcode'
import { ModalPortal } from '../../components/ui/ModalPortal'

const PAUSA_ENTRE_LECTURAS_MS = 1000
const PAUSA_MISMO_CODIGO_MS = 2500

function esperarDom() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

async function detenerEscaner(escaner: Html5QrcodeType | null) {
  if (!escaner) return
  try {
    await escaner.stop()
  } catch {
    // La cámara ya estaba detenida.
  }
  try {
    escaner.clear()
  } catch {
    // El contenedor ya estaba limpio.
  }
}

function bipConfirmacion(contexto: AudioContext | null) {
  if (!contexto) return
  const oscilador = contexto.createOscillator()
  const ganancia = contexto.createGain()
  oscilador.frequency.value = 880
  ganancia.gain.value = 0.06
  oscilador.connect(ganancia)
  ganancia.connect(contexto.destination)
  oscilador.start()
  oscilador.stop(contexto.currentTime + 0.08)
}

interface Props {
  abierto: boolean
  onCerrar: () => void
  onCodigo: (codigo: string) => Promise<string | null>
}

export function EscanerCodigoSheet({ abierto, onCerrar, onCodigo }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const escanerRef = useRef<Html5QrcodeType | null>(null)
  const onCodigoRef = useRef(onCodigo)
  const ultimoRef = useRef({ valor: '', at: 0 })
  const audioRef = useRef<AudioContext | null>(null)
  const scannerId = useId().replace(/:/g, '')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(true)
  const [ultimoLeido, setUltimoLeido] = useState('')
  const [flashActivo, setFlashActivo] = useState(false)
  const [soportaFlash, setSoportaFlash] = useState(false)

  onCodigoRef.current = onCodigo

  useEffect(() => {
    if (!abierto) return undefined
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AudioCtx && !audioRef.current) {
      audioRef.current = new AudioCtx()
    }
    void audioRef.current?.resume()

    let cancelado = false
    ultimoRef.current = { valor: '', at: 0 }
    setUltimoLeido('')
    setAviso(null)
    setError(null)

    const iniciar = async () => {
      setIniciando(true)
      setFlashActivo(false)
      setSoportaFlash(false)
      await esperarDom()
      if (cancelado || !hostRef.current) return

      const contenedor = document.createElement('div')
      contenedor.id = scannerId
      hostRef.current.replaceChildren(contenedor)

      try {
        const escaner = new Html5Qrcode(scannerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
          ],
          verbose: false,
        })
        escanerRef.current = escaner
        const config = {
          fps: 12,
          qrbox: (ancho: number, alto: number) => {
            const lado = Math.floor(Math.min(ancho, alto) * 0.72)
            const size = Math.max(Math.min(lado, 280), 180)
            return { width: size, height: Math.floor(size * 0.45) }
          },
        }
        const alLeer = async (texto: string) => {
          if (cancelado) return
          const valor = texto.trim()
          if (!valor) return
          const ahora = Date.now()
          const previo = ultimoRef.current
          if (previo.at && ahora - previo.at < PAUSA_ENTRE_LECTURAS_MS) return
          if (previo.valor === valor && ahora - previo.at < PAUSA_MISMO_CODIGO_MS) return
          ultimoRef.current = { valor, at: ahora }
          setUltimoLeido(valor)
          bipConfirmacion(audioRef.current)
          const mensaje = await onCodigoRef.current(valor)
          if (!cancelado) setAviso(mensaje)
        }

        try {
          await escaner.start({ facingMode: 'environment' }, config, alLeer, () => undefined)
        } catch (startErr) {
          const camaras = await Html5Qrcode.getCameras().catch(() => [])
          const trasera = camaras.find((camara) => /back|rear|environment|trasera|posterior/i.test(camara.label || ''))
            || camaras[camaras.length - 1]
          if (!trasera?.id) throw startErr
          await escaner.start(trasera.id, config, alLeer, () => undefined)
        }

        const capacidades = escaner.getRunningTrackCameraCapabilities?.() as { torch?: boolean } | undefined
        if (!cancelado) {
          setSoportaFlash(Boolean(capacidades?.torch))
          setIniciando(false)
        }
      } catch (err) {
        if (cancelado) return
        setError(err instanceof Error ? err.message : 'No se pudo acceder a la cámara.')
        setIniciando(false)
      }
    }

    void iniciar()

    return () => {
      cancelado = true
      const escaner = escanerRef.current
      escanerRef.current = null
      void detenerEscaner(escaner).finally(() => {
        hostRef.current?.replaceChildren()
      })
    }
  }, [abierto, scannerId])

  const alternarFlash = async () => {
    const escaner = escanerRef.current
    if (!escaner) return
    const siguiente = !flashActivo
    try {
      await escaner.applyVideoConstraints({ advanced: [{ torch: siguiente }] } as unknown as MediaTrackConstraints)
      setFlashActivo(siguiente)
    } catch {
      setSoportaFlash(false)
    }
  }

  if (!abierto) return null

  return (
    <ModalPortal>
      <div className="pdv-overlay pdv-overlay--stacked" role="presentation">
        <section aria-modal="true" className="pdv-sheet pdv-sheet--detail" role="dialog">
          <header className="pdv-sheet__header">
            <div>
              <span className="pdv-kicker">Registro continuo</span>
              <h2>Escanear producto</h2>
            </div>
            <button aria-label="Cerrar escáner" className="pdv-icon-button" onClick={onCerrar} type="button">
              <X size={18} />
            </button>
          </header>
          <div className="pdv-form pdv-form--wizard">
            <div className="pdv-form__scroll">
              <p className="pdv-muted">
                Apunta al código. El escáner permanece abierto y cada lectura agrega una pieza en estado Bueno.
              </p>
              <div className="pdv-scanner">
                <div ref={hostRef} />
                {iniciando && !error && (
                  <p className="pdv-scanner__status"><Camera size={16} /> Iniciando cámara…</p>
                )}
              </div>
              {ultimoLeido && <p className="pdv-muted">Último leído: {ultimoLeido}</p>}
              {aviso && <p className="pdv-inline-error">{aviso}</p>}
              {error && <p className="pdv-inline-error">{error}</p>}
            </div>
            <div className="pdv-wizard-actions">
              {soportaFlash && (
                <button className="secondary-button" onClick={() => void alternarFlash()} type="button">
                  {flashActivo ? <FlashlightOff size={16} /> : <Flashlight size={16} />}
                  {flashActivo ? 'Apagar flash' : 'Encender flash'}
                </button>
              )}
              <button className="primary-button" onClick={onCerrar} type="button">Listo</button>
            </div>
          </div>
        </section>
      </div>
    </ModalPortal>
  )
}
