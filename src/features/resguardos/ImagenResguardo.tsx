import { useEffect, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { apiBlobRequest } from '../../lib/api/apiClient'

interface Props {
  alt: string
  path: string
  token: string
}

export function ImagenResguardo({ alt, path, token }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [fallo, setFallo] = useState(false)
  const [overlayMontado, setOverlayMontado] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(false)

  useEffect(() => {
    let activo = true
    let objectUrl: string | null = null
    setSrc(null)
    setFallo(false)

    void apiBlobRequest(path, token)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (activo) setSrc(objectUrl)
        else URL.revokeObjectURL(objectUrl)
      })
      .catch(() => {
        if (activo) setFallo(true)
      })

    return () => {
      activo = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path, token])

  const ampliar = (event: ReactPointerEvent<HTMLImageElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setOverlayMontado(true)
    window.requestAnimationFrame(() => setOverlayVisible(true))
  }

  const soltar = () => setOverlayVisible(false)

  useEffect(() => {
    if (!overlayMontado || overlayVisible) return undefined
    const timer = window.setTimeout(() => setOverlayMontado(false), 280)
    return () => window.clearTimeout(timer)
  }, [overlayMontado, overlayVisible])

  if (fallo) return <div className="pdv-photo__empty">No se pudo cargar</div>
  if (!src) return <div className="pdv-photo__empty">Cargando imagen…</div>
  return (
    <>
      <img
        alt={alt}
        className={overlayMontado ? 'pdv-evidence-thumb--pressed' : undefined}
        src={src}
        onPointerDown={ampliar}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onLostPointerCapture={soltar}
      />
      {overlayMontado && (
        <div
          className={`pdv-evidence-zoom${overlayVisible ? ' pdv-evidence-zoom--visible' : ''}`}
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget || overlayVisible) return
            setOverlayMontado(false)
          }}
          role="presentation"
        >
          <img alt={alt} src={src} />
        </div>
      )}
    </>
  )
}
