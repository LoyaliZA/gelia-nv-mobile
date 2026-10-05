export interface VisitaProgramadaItem {
  id: number
  fecha: string
  tipo_hora: string
  hora_etiqueta: string
  estado_tiempo: 'en_tiempo' | 'retrasado' | 'sin_referencia'
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
