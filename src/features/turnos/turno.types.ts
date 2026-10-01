export interface TurnoAtencionResumen {
  id: number
  user_id: number
  primer_nombre: string
  inicio_at: string | null
  atencion_inicio_at: string | null
  atencion_en_curso: boolean
  espera_inicial_vencida: boolean
}

export interface TurnoRecepcionItem {
  id: number
  folio: string
  cliente_id: number | null
  estado: string
  servicio: string
  sucursal_id: number
  snapshot_nombre_llamado: string
  prioridad_diamante: boolean
  prioridad_vip: boolean
  prioridad_adulto_mayor: boolean
  prioridad_discapacidad: boolean
  alta_at: string | null
  espera_segundos: number | null
  reatencion_expira_at: string | null
  reatencion_vigente: boolean
  version?: number
  puede_baja_cola: boolean
  atencion?: TurnoAtencionResumen | null
}

export interface TurnosRecepcionResponse {
  servidor_at: string
  resumen: {
    en_espera: number
    asignados: number
    mayor_espera_segundos: number
    vendedores_disponibles: number
  }
  en_cola: TurnoRecepcionItem[]
  asignados: TurnoRecepcionItem[]
}

export interface AltaTurnoInput {
  clienteId?: number | null
  nombreLlamado?: string | null
  prioridadAdultoMayor?: boolean
  prioridadDiscapacidad?: boolean
}
