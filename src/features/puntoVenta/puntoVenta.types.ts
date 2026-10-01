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
