export interface PdvSucursal {
  id: number
  nombre: string
  es_principal?: boolean
}

export interface PdvPermisos {
  resguardos_ver: boolean
  resguardos_registrar_manual: boolean
  resguardos_confirmar_llegada: boolean
  resguardos_enviar_a_custodia: boolean
  resguardos_confirmar_custodia: boolean
  resguardos_entregar: boolean
  resguardos_ver_rezagados: boolean
  resguardos_ver_vencidos: boolean
  resguardos_incidencia_folio: boolean
  resguardos_incidencia_dano: boolean
  resguardos_incidencia_faltante: boolean
  resguardos_autorizar_entrega_incidencia: boolean
  resguardos_confirmar_devolucion: boolean
  resguardos_reponer_vencido: boolean
  resguardos_ver_historial_entregas: boolean
  turnos_ver: boolean
  turnos_alta: boolean
}

export interface PdvOrigenResguardo {
  id: number
  nombre: string
}

export interface PuntoVentaContexto {
  sucursal_activa: PdvSucursal | null
  sucursales_operables: PdvSucursal[]
  registro_manual: boolean
  origenes: PdvOrigenResguardo[]
  permisos: PdvPermisos
}
