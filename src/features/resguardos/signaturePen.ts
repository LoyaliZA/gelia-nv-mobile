import getStroke from 'perfect-freehand'

export const FIRMA_STROKE_COLOR = '#1e3a8a'

export const FIRMA_PEN_OPTIONS = {
  size: 8,
  thinning: 0.65,
  smoothing: 0.5,
  streamline: 0.45,
  simulatePressure: true,
  easing: (t: number) => t,
  start: { taper: 4, cap: true },
  end: { taper: 4, cap: true },
} as const

export type PuntoFirma = [number, number, number]

const promedio = (a: number, b: number) => (a + b) / 2

/** Convierte el contorno de perfect-freehand en un path SVG cerrado para rellenar en canvas. */
export function pathSvgDesdeTrazo(puntos: number[][]): string {
  const len = puntos.length
  if (len < 4) return ''

  let a = puntos[0]
  let b = puntos[1]
  const c = puntos[2]

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${promedio(b[0], c[0]).toFixed(2)},${promedio(b[1], c[1]).toFixed(2)} T`

  for (let i = 2, max = len - 1; i < max; i++) {
    a = puntos[i]
    b = puntos[i + 1]
    result += `${promedio(a[0], b[0]).toFixed(2)},${promedio(a[1], b[1]).toFixed(2)} `
  }

  result += 'Z'
  return result
}

export function dibujarTrazoPluma(
  context: CanvasRenderingContext2D,
  puntos: PuntoFirma[],
  color = FIRMA_STROKE_COLOR,
) {
  if (puntos.length < 2) return

  const contorno = getStroke(puntos, FIRMA_PEN_OPTIONS)
  const pathData = pathSvgDesdeTrazo(contorno)
  if (!pathData) return

  const path = new Path2D(pathData)
  context.fillStyle = color
  context.fill(path)
}

export function limpiarLienzoFirma(
  context: CanvasRenderingContext2D,
  ancho: number,
  alto: number,
) {
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, ancho, alto)
}
