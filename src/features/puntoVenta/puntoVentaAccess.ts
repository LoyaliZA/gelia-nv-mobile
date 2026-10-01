import { hasAnyPermission } from '../../utils/can'

export const PDV_PERMISSION = {
  acceder: 'punto_venta.acceder',
  resguardosVer: 'pdv.resguardos.ver',
  resguardosRegistrarManual: 'pdv.resguardos.registrar_manual',
  resguardosConfirmarLlegada: 'pdv.resguardos.confirmar_llegada',
  resguardosEnviarACustodia: 'pdv.resguardos.enviar_a_custodia',
  resguardosConfirmarCustodia: 'pdv.resguardos.confirmar_custodia',
  resguardosEntregar: 'pdv.resguardos.entregar',
  resguardosVerRezagados: 'pdv.resguardos.ver_rezagados',
  resguardosVerVencidos: 'pdv.resguardos.ver_vencidos',
  resguardosIncidenciaFolio: 'pdv.resguardos.incidencia_folio',
  resguardosIncidenciaDano: 'pdv.resguardos.incidencia_dano',
  resguardosIncidenciaFaltante: 'pdv.resguardos.incidencia_faltante',
  resguardosAutorizarEntregaIncidencia: 'pdv.resguardos.autorizar_entrega_incidencia',
  resguardosConfirmarDevolucion: 'pdv.resguardos.confirmar_devolucion',
  resguardosReponerVencido: 'pdv.resguardos.reponer_vencido',
  resguardosVerHistorialEntregas: 'pdv.resguardos.ver_historial_entregas',
  turnosVer: 'pdv.turnos.ver',
  turnosAlta: 'pdv.turnos.alta',
  turnosMarcarPrioridad: 'pdv.turnos.marcar_prioridad',
} as const

export function puedeAccederPuntoVenta(permissions: string[]) {
  return permissions.includes(PDV_PERMISSION.acceder)
}

export function puedeVerResguardosMovil(permissions: string[]) {
  return puedeAccederPuntoVenta(permissions)
    && hasAnyPermission(permissions, [PDV_PERMISSION.resguardosVer])
}

export function puedeAbrirRecepcionTurnosMovil(permissions: string[]) {
  return puedeAccederPuntoVenta(permissions)
    && hasAnyPermission(permissions, [PDV_PERMISSION.turnosVer, PDV_PERMISSION.turnosAlta])
}

export function puedeConfirmarCustodiaResguardo(permissions: string[]) {
  return permissions.includes(PDV_PERMISSION.resguardosConfirmarCustodia)
}

export function puedeMarcarPrioridadTurnoMovil(permissions: string[]) {
  return permissions.includes(PDV_PERMISSION.turnosMarcarPrioridad)
}
