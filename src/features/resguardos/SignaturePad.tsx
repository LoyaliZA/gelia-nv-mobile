import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Eraser, PenLine } from 'lucide-react'
import {
  dibujarTrazoPluma,
  limpiarLienzoFirma,
  type PuntoFirma,
} from './signaturePen'

export interface SignaturePadHandle {
  clear: () => void
  toBlob: () => Promise<Blob | null>
  hasSignature: () => boolean
  getDataUrl: () => string | null
  loadDataUrl: (dataUrl: string | null) => void
}

interface SignaturePadProps {
  onSignatureChange?: (dataUrl: string | null) => void
  canvasHeight?: number
  className?: string
  showFooter?: boolean
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad({
  onSignatureChange,
  canvasHeight = 220,
  className = '',
  showFooter = true,
}, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const signedRef = useRef(false)
  const strokesRef = useRef<PuntoFirma[][]>([])
  const currentStrokeRef = useRef<PuntoFirma[]>([])
  const persistedDataUrlRef = useRef<string | null>(null)
  const onChangeRef = useRef(onSignatureChange)
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    onChangeRef.current = onSignatureChange
  }, [onSignatureChange])

  const marcarFirmado = useCallback((valor: boolean) => {
    signedRef.current = valor
    setSigned(valor)
  }, [])

  const publicarFirma = useCallback(() => {
    if (!signedRef.current) {
      onChangeRef.current?.(null)
      return
    }
    onChangeRef.current?.(canvasRef.current?.toDataURL('image/png') ?? null)
  }, [])

  const redibujar = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const displayWidth = container.clientWidth
    const displayHeight = canvasHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    limpiarLienzoFirma(ctx, displayWidth, displayHeight)
    for (const stroke of strokesRef.current) {
      dibujarTrazoPluma(ctx, stroke)
    }
    if (currentStrokeRef.current.length > 0) {
      dibujarTrazoPluma(ctx, currentStrokeRef.current)
    }
  }, [canvasHeight])

  const configurarCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const displayWidth = container.clientWidth
    const displayHeight = canvasHeight

    let dataUrlPersistido = persistedDataUrlRef.current
    if (!drawingRef.current && signedRef.current && canvas.width > 0) {
      const captura = canvas.toDataURL('image/png')
      if (captura) {
        dataUrlPersistido = captura
        persistedDataUrlRef.current = captura
      }
    }

    canvas.width = Math.floor(displayWidth * dpr)
    canvas.height = Math.floor(displayHeight * dpr)
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    if (dataUrlPersistido && strokesRef.current.length === 0) {
      const img = new Image()
      img.onload = () => {
        limpiarLienzoFirma(ctx, displayWidth, displayHeight)
        const escala = Math.min(displayWidth / img.width, displayHeight / img.height)
        const ancho = img.width * escala
        const alto = img.height * escala
        const offsetX = (displayWidth - ancho) / 2
        const offsetY = (displayHeight - alto) / 2
        ctx.drawImage(img, offsetX, offsetY, ancho, alto)
        marcarFirmado(true)
      }
      img.src = dataUrlPersistido
      return
    }

    redibujar()
  }, [canvasHeight, marcarFirmado, redibujar])

  useEffect(() => {
    configurarCanvas()

    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(() => {
      if (!drawingRef.current) configurarCanvas()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [configurarCanvas])

  const puntoDesdeEvento = (event: ReactPointerEvent<HTMLCanvasElement>): PuntoFirma => {
    const rect = event.currentTarget.getBoundingClientRect()
    const pressure = event.pressure > 0 ? event.pressure : 0.5
    return [
      event.clientX - rect.left,
      event.clientY - rect.top,
      pressure,
    ]
  }

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    persistedDataUrlRef.current = null
    currentStrokeRef.current = [puntoDesdeEvento(event)]
    marcarFirmado(true)
    redibujar()
  }

  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    currentStrokeRef.current.push(puntoDesdeEvento(event))
    redibujar()
  }

  const finalizarTrazo = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push([...currentStrokeRef.current])
      currentStrokeRef.current = []
      redibujar()
      publicarFirma()
    }
  }

  const clear = useCallback(() => {
    strokesRef.current = []
    currentStrokeRef.current = []
    persistedDataUrlRef.current = null
    drawingRef.current = false
    marcarFirmado(false)
    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && container && ctx) {
      limpiarLienzoFirma(ctx, container.clientWidth, canvasHeight)
    }
    onChangeRef.current?.(null)
  }, [canvasHeight, marcarFirmado])

  const loadDataUrl = useCallback((dataUrl: string | null) => {
    if (!dataUrl) {
      clear()
      return
    }
    strokesRef.current = []
    currentStrokeRef.current = []
    persistedDataUrlRef.current = dataUrl
    marcarFirmado(true)
    configurarCanvas()
    onChangeRef.current?.(dataUrl)
  }, [clear, configurarCanvas, marcarFirmado])

  useImperativeHandle(ref, () => ({
    clear,
    hasSignature: () => signedRef.current,
    getDataUrl: () => {
      if (!signedRef.current) return null
      return canvasRef.current?.toDataURL('image/png') ?? null
    },
    loadDataUrl,
    toBlob: () => new Promise((resolve) => {
      if (!signedRef.current) {
        resolve(null)
        return
      }
      canvasRef.current?.toBlob((blob) => resolve(blob), 'image/png')
    }),
  }), [clear, loadDataUrl])

  const rootClass = ['pdv-signature', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass} ref={containerRef}>
      <div className="pdv-signature__canvas-wrap">
        <canvas
          aria-label="Área de firma"
          className="pdv-signature__canvas"
          onPointerCancel={finalizarTrazo}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={finalizarTrazo}
          ref={canvasRef}
          style={{ height: `${canvasHeight}px` }}
        />
        {!signed && (
          <div aria-hidden="true" className="pdv-signature__placeholder">
            <PenLine size={16} />
            <span>Dibuja la firma aquí</span>
          </div>
        )}
      </div>
      {showFooter && (
        <div className="pdv-signature__footer">
          <span>{signed ? 'Firma capturada' : 'Firma dentro del recuadro'}</span>
          <button disabled={!signed} onClick={clear} type="button">
            <Eraser size={15} /> Limpiar
          </button>
        </div>
      )}
    </div>
  )
})
