import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Eraser } from 'lucide-react'

export interface SignaturePadHandle {
  clear: () => void
  toBlob: () => Promise<Blob | null>
  hasSignature: () => boolean
}

interface SignaturePadProps {
  onSignatureChange?: (dataUrl: string | null) => void
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad({
  onSignatureChange,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const signedRef = useRef(false)
  const onChangeRef = useRef(onSignatureChange)
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    onChangeRef.current = onSignatureChange
  }, [onSignatureChange])

  const resize = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0) return

    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(220 * dpr)

    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.lineWidth = 2.4
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = getComputedStyle(canvas).color
    const habiaFirma = signedRef.current
    signedRef.current = false
    setSigned(false)
    if (habiaFirma) onChangeRef.current?.(null)
  }

  useEffect(() => {
    resize()
    const canvas = canvasRef.current
    if (!canvas || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => resize())
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    lastPointRef.current = point(event)
  }

  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const previous = lastPointRef.current
    if (!canvas || !context || !previous) return

    const next = point(event)
    context.beginPath()
    context.moveTo(previous.x, previous.y)
    context.lineTo(next.x, next.y)
    context.stroke()
    lastPointRef.current = next
    signedRef.current = true
    setSigned(true)
  }

  const publicarFirma = () => {
    if (!signedRef.current) {
      onChangeRef.current?.(null)
      return
    }
    onChangeRef.current?.(canvasRef.current?.toDataURL('image/png') ?? null)
  }

  const pointerUp = () => {
    drawingRef.current = false
    lastPointRef.current = null
    publicarFirma()
  }

  const clear = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    signedRef.current = false
    setSigned(false)
    onChangeRef.current?.(null)
  }

  useImperativeHandle(ref, () => ({
    clear,
    hasSignature: () => signed,
    toBlob: () => new Promise((resolve) => {
      canvasRef.current?.toBlob((blob) => resolve(blob), 'image/png')
    }),
  }), [signed])

  return (
    <div className="pdv-signature">
      <canvas
        aria-label="Área de firma"
        className="pdv-signature__canvas"
        onPointerCancel={pointerUp}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        ref={canvasRef}
      />
      <div className="pdv-signature__footer">
        <span>{signed ? 'Firma capturada' : 'Firma dentro del recuadro'}</span>
        <button onClick={clear} type="button">
          <Eraser size={15} /> Limpiar
        </button>
      </div>
    </div>
  )
})
