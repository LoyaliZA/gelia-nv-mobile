import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Calculator,
  ChartNoAxesColumn,
  Database,
  FolderTree,
  Globe,
  History,
  LifeBuoy,
  Link as LinkIcon,
  Map,
  Palette,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react'

export interface AdminModule {
  id: string
  title: string
  description: string
  path: string
  icon: LucideIcon
  permission?: string
  permissionAny?: string[]
}

export const ADMIN_MODULES: AdminModule[] = [
  { id: 'enlaces', title: 'Generar Enlaces', description: 'Crear enlaces seguros de registro.', path: '/admin/enlaces', icon: LinkIcon, permission: 'usuarios.generar_permisos' },
  { id: 'clientes', title: 'Base de Clientes', description: 'Gestionar clientes e importaciones.', path: '/admin/clientes', icon: Database, permission: 'clientes.ver' },
  { id: 'catalogos', title: 'Catálogos Globales', description: 'Departamentos, procesos y listas.', path: '/admin/catalogos', icon: FolderTree, permission: 'catalogos.gestionar' },
  { id: 'personalizacion', title: 'Personalización', description: 'Tonos, fondos y temas visuales.', path: '/admin/personalizacion', icon: Palette, permission: 'personalizacion.gestionar' },
  { id: 'comisiones', title: 'Comisiones', description: 'Tabuladores y montos de comisión.', path: '/admin/comisiones', icon: Calculator, permission: 'comisiones.gestionar' },
  { id: 'usuarios', title: 'Usuarios', description: 'Cuentas, roles y permisos.', path: '/admin/usuarios', icon: Users, permission: 'usuarios.gestionar' },
  { id: 'auditorias', title: 'Auditorías de Sistema', description: 'Historial de cambios críticos.', path: '/admin/auditorias-sistema', icon: History, permissionAny: ['sistema.auditorias.ver', 'sistema.auditorias.accesos.ver'] },
  { id: 'api_externa', title: 'API Externa', description: 'Integraciones y auditoría.', path: '/admin/api-externa', icon: Globe, permissionAny: ['api_externa.gestionar', 'api_externa.ver_auditoria'] },
  { id: 'mapa_logistico', title: 'Mapa Logístico', description: 'Zonas y polígonos de entregas.', path: '/admin/mapa-logistico', icon: Map, permission: 'entregas.configurar_zonas' },
  { id: 'woocommerce', title: 'Sincronizar Precios', description: 'WooCommerce: precios y catálogo.', path: '/woocommerce', icon: ShoppingBag, permission: 'woocommerce.configurar' },
  { id: 'tiendanube', title: 'Tiendanube', description: 'Catálogo, SEO e imágenes.', path: '/tiendanube', icon: ShoppingBag, permission: 'tiendanube.configurar' },
  { id: 'configuracion_sistema', title: 'Configuración del Sistema', description: 'Variables globales e integraciones.', path: '/admin/configuracion-sistema', icon: Settings, permission: 'configuracion_sistema.gestionar' },
  { id: 'gelia_ai_acceso', title: 'Acceso GELIA', description: 'Quién puede usar el asistente.', path: '/admin/gelia-ai/acceso', icon: Bot, permission: 'gelia_ai.gestionar_acceso' },
  { id: 'gelia_ai_uso', title: 'Uso GELIA', description: 'Tokens y auditoría del asistente.', path: '/admin/gelia-ai/uso', icon: ChartNoAxesColumn, permission: 'gelia_ai.gestionar_acceso' },
  { id: 'soporte_gestion', title: 'Gestión de Soporte', description: 'Tickets y configuración de SLA.', path: '/soporte/agente/tickets', icon: LifeBuoy, permissionAny: ['soporte.gestionar', 'soporte.administrar'] },
]

export function adminModuleHref(item: AdminModule) {
  return item.path
}

export function isAdminModuleAllowed(item: AdminModule, can: (permission: string) => boolean) {
  if (item.permissionAny?.length) {
    return item.permissionAny.some((perm) => can(perm))
  }
  return item.permission ? can(item.permission) : false
}

export function hasAnyAdminModuleAccess(can: (permission: string) => boolean) {
  return ADMIN_MODULES.some((item) => isAdminModuleAllowed(item, can))
}
