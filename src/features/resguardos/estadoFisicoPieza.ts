export const ESTADOS_FISICOS_PIEZA = [
  { value: 'bueno', label: 'Bueno' },
  { value: 'regular', label: 'Regular' },
  { value: 'malo', label: 'Malo' },
  { value: 'danado', label: 'Dañado' },
  { value: 'sin_existencia', label: 'Sin existencias' },
] as const

export type EstadoFisicoPieza = (typeof ESTADOS_FISICOS_PIEZA)[number]['value']

export function etiquetaEstadoFisico(estado?: string | null) {
  return ESTADOS_FISICOS_PIEZA.find((item) => item.value === estado)?.label ?? 'Bueno'
}

export function requiereObservacionPieza(estado: string) {
  return estado === 'malo' || estado === 'danado' || estado === 'sin_existencia'
}

export function requiereFotoPieza(estado: string) {
  return estado === 'malo' || estado === 'danado'
}
