export const FIRMA_ENTREGA_ANCHO_NORMALIZADO = 600
export const FIRMA_ENTREGA_ALTO_NORMALIZADO = 200

/** Escala la firma capturada en pantalla completa al tamaño del panel de evidencia. */
export function normalizarDataUrlFirma(
  dataUrl: string | null,
  ancho = FIRMA_ENTREGA_ANCHO_NORMALIZADO,
  alto = FIRMA_ENTREGA_ALTO_NORMALIZADO,
): Promise<string | null> {
  if (!dataUrl || typeof document === 'undefined') {
    return Promise.resolve(dataUrl)
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = ancho
      canvas.height = alto
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, ancho, alto)
      const escala = Math.min(ancho / img.width, alto / img.height)
      const anchoDibujo = img.width * escala
      const altoDibujo = img.height * escala
      const offsetX = (ancho - anchoDibujo) / 2
      const offsetY = (alto - altoDibujo) / 2
      ctx.drawImage(img, offsetX, offsetY, anchoDibujo, altoDibujo)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export function dataUrlABlob(dataUrl: string): Promise<Blob | null> {
  return fetch(dataUrl).then((res) => res.blob()).catch(() => null)
}

export function esDispositivoCampo(): boolean {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  return Boolean(coarse || mobileUa)
}
