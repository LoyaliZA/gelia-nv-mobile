import type { VisitaProgramadaItem } from './visita.types'

export function fechaVisita(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(parsed)
}

export function etiquetaTiempo(estado: VisitaProgramadaItem['estado_tiempo']) {
  if (estado === 'retrasado') return 'Retrasado'
  if (estado === 'en_tiempo') return 'En tiempo'
  return null
}

export function etiquetaEstado(item: VisitaProgramadaItem) {
  const raw = item.estado_etiqueta ?? item.estado
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return 'Programada'
}

export function nombreSucursal(item: VisitaProgramadaItem, fallback: string | null) {
  const nombre = item.sucursal?.nombre?.trim()
  if (nombre) return nombre
  return fallback
}

export function etiquetaAsistencia(item: VisitaProgramadaItem) {
  if (item.asistencia_etiqueta?.trim()) return item.asistencia_etiqueta.trim()
  if (item.asistencia_confirmada === true) return 'Confirmó asistencia'
  if (item.asistencia_confirmada === false) return 'Sin confirmar'
  return null
}

export function visitaCardDomId(visitaId: number) {
  return `visita-${visitaId}`
}
