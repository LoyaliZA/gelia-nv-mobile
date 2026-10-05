export interface VisitaProgramadaItem {
  id: number
  fecha: string
  tipo_hora: string
  hora_etiqueta: string
  estado?: string | null
  estado_etiqueta?: string | null
  estado_tiempo: 'en_tiempo' | 'retrasado' | 'sin_referencia'
  probabilidad_asistencia?: string | null
  asistencia_confirmada?: boolean | null
  asistencia_etiqueta?: string | null
  sucursal?: {
    id?: number
    nombre?: string | null
  } | null
  cliente: {
    id: number
    numero_cliente: string
    nombre: string
  } | null
  registrado_por: {
    id: number
    nombre: string
    departamento: string | null
  } | null
}

export interface VisitasDelDiaResponse {
  servidor_at: string
  visitas: VisitaProgramadaItem[]
}
