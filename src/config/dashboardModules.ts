import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { AppRoute } from '../app/routes'
import { getMobileRouteForLink, isMobileLinkEnabled } from './mobileRoutes'
import {
    Users, UserPlus, FolderTree, Database, FileSignature, Package, Map, List, Ban, Briefcase, CreditCard, FileSpreadsheet, Receipt, ShoppingBag, Store, Calculator, Boxes, DollarSign, ArrowLeftRight, Bot
} from 'lucide-react';


export interface DashboardCardDef {
  id: string
  titulo: string
  subtitulo: string
  icon: LucideIcon
  href: () => string
  permiso?: string
  permisoAny?: string[]
  accesoGeliaAi?: boolean
  borderClass?: string
  borderStyle?: CSSProperties
  iconWrapClass?: string
  iconWrapStyle?: CSSProperties
  iconClass?: string
  iconStyle?: CSSProperties
  mobileEnabled: boolean
  mobileRoute: AppRoute | null
}

function enrichCard<T extends { id: string }>(card: T): T & { mobileEnabled: boolean; mobileRoute: AppRoute | null } {
  return {
    ...card,
    mobileEnabled: isMobileLinkEnabled(card.id.replace(/^card_/, '').replace(/^func_/, '')) || isMobileLinkEnabled(card.id),
    mobileRoute: getMobileRouteForLink(card.id.replace(/^card_/, '')) ?? getMobileRouteForLink(card.id),
  }
}

const RAW_MODULE_CARDS = [
    {
        id: 'card_gelia_ai',
        titulo: 'GELIA',
        subtitulo: 'Asistente de ayuda y consultas.',
        accesoGeliaAi: true,
        href: () => '/gelia_ai.index',
        icon: Bot,
        borderClass: '',
        borderStyle: { borderColor: 'var(--color-primario)' },
        iconWrapClass: '',
        iconWrapStyle: { backgroundColor: 'color-mix(in srgb, var(--color-primario) 15%, transparent)' },
        iconClass: '',
        iconStyle: { color: 'var(--color-primario)' },
    },
    {
        id: 'card_contabilidad',
        titulo: 'Contabilidad',
        subtitulo: 'Utilidad y comisiones.',
        permiso: 'contabilidad.ver',
        href: () => '/contabilidad',
        icon: Calculator,
        borderClass: 'border-teal-500/20',
        iconWrapClass: 'bg-teal-500/10 border-teal-500/20',
        iconClass: 'text-teal-500',
    },
    {
        id: 'card_auto_cobranza',
        titulo: 'Credibox',
        subtitulo: 'Crédito y cobros.',
        permiso: 'cobranza.ver',
        href: () => '/auto-cobranza.index',
        icon: CreditCard,
        borderClass: 'border-red-500/20',
        iconWrapClass: 'bg-red-500/10 border-red-500/20',
        iconClass: 'text-red-500',
    },
    {
        id: 'card_usuarios',
        titulo: 'Control de Usuarios',
        subtitulo: 'Roles y personal.',
        permiso: 'usuarios.gestionar',
        href: () => '/admin.usuarios',
        icon: Users,
        borderClass: '',
        borderStyle: { borderColor: 'var(--color-primario)' },
        iconWrapClass: '',
        iconWrapStyle: { backgroundColor: 'color-mix(in srgb, var(--color-primario) 15%, transparent)' },
        iconClass: '',
        iconStyle: { color: 'var(--color-primario)' },
    },
    {
        id: 'card_enlaces',
        titulo: 'Generar Accesos',
        subtitulo: 'Crear enlaces seguros.',
        permiso: 'usuarios.generar_permisos',
        href: () => '/admin.enlaces',
        icon: UserPlus,
        borderClass: 'theme-border',
        iconWrapClass: 'theme-element theme-border',
        iconClass: 'theme-text-main',
    },
    {
        id: 'card_catalogos',
        titulo: 'Catálogos Centrales',
        subtitulo: 'Procesos y comisiones.',
        permiso: 'catalogos.gestionar',
        href: () => '/admin.catalogos',
        icon: FolderTree,
        borderClass: 'border-blue-500/20',
        iconWrapClass: 'bg-blue-500/10 border-blue-500/20',
        iconClass: 'text-blue-500',
    },
    {
        id: 'card_clientes_bd',
        titulo: 'Base de Clientes',
        subtitulo: 'Sincronización Wizerp.',
        permiso: 'clientes.ver',
        href: () => '/admin.clientes',
        icon: Database,
        borderClass: 'border-emerald-500/20',
        iconWrapClass: 'bg-emerald-500/10 border-emerald-500/20',
        iconClass: 'text-emerald-500',
    },
    {
        id: 'card_solicitudes',
        titulo: 'Panel Solicitudes',
        subtitulo: 'Procesos financieros TAG.',
        permiso: 'solicitudes.ver_listado',
        href: () => '/solicitudes.index',
        icon: FileSignature,
        borderClass: 'border-amber-500/20',
        iconWrapClass: 'bg-amber-500/10 border-amber-500/20',
        iconClass: 'text-amber-500',
    },
    {
        id: 'card_cancelaciones_cotizaciones',
        titulo: 'Cancel. y Cotizaciones',
        subtitulo: 'Remisión, pedido y cotización.',
        permiso: 'cancelaciones_cotizaciones.ver_listado',
        href: () => '/cancelaciones_cotizaciones.index',
        icon: Ban,
        borderClass: 'border-orange-500/20',
        iconWrapClass: 'bg-orange-500/10 border-orange-500/20',
        iconClass: 'text-orange-500',
    },
    {
        id: 'card_control_pedidos',
        titulo: 'Registrar pedidos',
        subtitulo: 'Pedidos BMA.',
        permiso: 'control_pedidos.ver_listado',
        href: () => '/control_pedidos.index',
        icon: Package,
        borderClass: 'border-blue-500/20',
        iconWrapClass: 'bg-blue-500/10 border-blue-500/20',
        iconClass: 'text-blue-500',
    },
    {
        id: 'card_almacenes_productos',
        titulo: 'Productos',
        subtitulo: 'Catálogo maestro de productos.',
        permisoAny: ['gestion_interna.productos.ver', 'almacenes.productos.ver', 'catalogos.gestionar'],
        href: () => '/gestion_interna.productos.index',
        icon: Package,
        borderClass: 'border-amber-500/20',
        iconWrapClass: 'bg-amber-500/10 border-amber-500/20',
        iconClass: 'text-amber-500',
    },
    {
        id: 'card_almacenes_inventarios',
        titulo: 'Inventarios',
        subtitulo: 'Existencias por almacén.',
        permisoAny: ['almacenes.inventarios.ver', 'catalogos.gestionar'],
        href: () => '/almacenes.inventarios.index',
        icon: Boxes,
        borderClass: 'border-orange-500/20',
        iconWrapClass: 'bg-orange-500/10 border-orange-500/20',
        iconClass: 'text-orange-500',
    },
    {
        id: 'card_almacenes_costos',
        titulo: 'Costos',
        subtitulo: 'Costos y precios por almacén.',
        permisoAny: ['almacenes.costos.ver', 'catalogos.gestionar'],
        href: () => '/almacenes.costos.index',
        icon: DollarSign,
        borderClass: 'border-yellow-500/20',
        iconWrapClass: 'bg-yellow-500/10 border-yellow-500/20',
        iconClass: 'text-yellow-500',
    },
    {
        id: 'card_activos',
        titulo: 'Control de Activos',
        subtitulo: 'Inventario y mantenimiento.',
        permiso: 'activos.ver',
        href: () => '/activos.index',
        icon: Package,
        borderClass: 'border-emerald-500/20',
        iconWrapClass: 'bg-emerald-500/10 border-emerald-500/20',
        iconClass: 'text-emerald-500',
    },
    {
        id: 'card_rh',
        titulo: 'Recursos Humanos',
        subtitulo: 'HE y colaboradores.',
        permiso: 'rh.ver',
        href: () => '/rh.index',
        icon: Briefcase,
        borderClass: 'border-rose-500/20',
        iconWrapClass: 'bg-rose-500/10 border-rose-500/20',
        iconClass: 'text-rose-500',
    },
    {
        id: 'card_clientes',
        titulo: 'Mis Clientes',
        subtitulo: 'Cartera y altas rápidas.',
        permiso: 'mis_clientes.gestionar',
        href: () => '/mis_clientes.index',
        icon: Users,
        borderClass: 'border-purple-500/20',
        iconWrapClass: 'bg-purple-500/10 border-purple-500/20',
        iconClass: 'text-purple-500',
    },
    {
        id: 'card_entregas',
        titulo: 'Área Logística',
        subtitulo: 'Cotizador y envíos.',
        permiso: 'entregas.cotizar',
        href: () => '/entregas.index',
        icon: Map,
        borderClass: 'border-indigo-500/20',
        iconWrapClass: 'bg-indigo-500/10 border-indigo-500/20',
        iconClass: 'text-indigo-500',
    },
    {
        id: 'card_plantilla_bellaroma',
        titulo: 'Plantilla Pedidos',
        subtitulo: 'Generación de lista de precios.',
        permiso: 'plantilla_pedidos.ver',
        href: () => '/plantilla_bellaroma.index',
        icon: FileSpreadsheet,
        borderClass: '',
        borderStyle: { borderColor: 'var(--color-primario)' },
        iconWrapClass: '',
        iconWrapStyle: { backgroundColor: 'color-mix(in srgb, var(--color-primario) 15%, transparent)' },
        iconClass: '',
        iconStyle: { color: 'var(--color-primario)' },
    },
    {
        id: 'card_woocommerce',
        titulo: 'Sincronizar Precios',
        subtitulo: 'Precios WooCommerce.',
        permiso: 'woocommerce.ver',
        href: () => '/woocommerce.index',
        icon: ShoppingBag,
        borderClass: 'border-violet-500/20',
        iconWrapClass: 'bg-violet-500/10 border-violet-500/20',
        iconClass: 'text-violet-500',
    },
    {
        id: 'card_tiendanube',
        titulo: 'Tiendanube',
        subtitulo: 'Catálogo, SEO e imágenes.',
        permiso: 'tiendanube.ver',
        href: () => '/tiendanube.index',
        icon: Store,
        borderClass: 'border-sky-500/20',
        iconWrapClass: 'bg-sky-500/10 border-sky-500/20',
        iconClass: 'text-sky-500',
    },
    {
        id: 'card_facturas',
        titulo: 'Facturación',
        subtitulo: 'Solicitudes CFDI.',
        permiso: 'facturas.ver_listado',
        href: () => '/facturas.index',
        icon: Receipt,
        borderClass: 'border-cyan-500/20',
        iconWrapClass: 'bg-cyan-500/10 border-cyan-500/20',
        iconClass: 'text-cyan-500',
    },
    {
        id: 'card_traspasos',
        titulo: 'Traspasos',
        subtitulo: 'Traspaso de piezas.',
        permiso: 'traspasos.ver_listado',
        href: () => '/traspasos.index',
        icon: ArrowLeftRight,
        borderClass: 'border-lime-500/20',
        iconWrapClass: 'bg-lime-500/10 border-lime-500/20',
        iconClass: 'text-lime-600 dark:text-lime-400',
    },
]

const RAW_FUNCTION_CARDS = [
    {
        id: 'func_listados',
        titulo: 'Generador de Listados',
        subtitulo: 'Listados personalizados.',
        permiso: 'listados.ver',
        href: () => '/listados.index',
        icon: List,
        borderClass: 'border-emerald-500/20',
        iconWrapClass: 'bg-emerald-500/10 border-emerald-500/20',
        iconClass: 'text-emerald-500',
    },
    {
        id: 'func_limpieza_clientes',
        titulo: 'Limpieza de Clientes',
        subtitulo: 'Corrección de codificación Wizerp.',
        permiso: 'funciones.limpieza_clientes',
        href: () => '/funciones.limpieza-clientes.index',
        icon: Database,
        borderClass: 'border-blue-500/20',
        iconWrapClass: 'bg-blue-500/10 border-blue-500/20',
        iconClass: 'text-blue-500',
    },
    {
        id: 'func_ejercicio_escalonamiento',
        titulo: 'Ejercicio Escalonamiento',
        subtitulo: 'Proyección Plata · Oro · Diamante.',
        permiso: 'ejercicio_escalonamiento.ver',
        href: () => '/ejercicio_escalonamiento.index',
        icon: Calculator,
        borderClass: 'border-violet-500/20',
        iconWrapClass: 'bg-violet-500/10 border-violet-500/20',
        iconClass: 'text-violet-500',
    },
    {
        id: 'func_asistencia',
        titulo: 'Asistencia',
        subtitulo: 'Procesamiento de checadora.',
        permiso: 'funciones.asistencia',
        href: () => '/funciones.asistencia.index',
        icon: Users,
        borderClass: 'border-amber-500/20',
        iconWrapClass: 'bg-amber-500/10 border-amber-500/20',
        iconClass: 'text-amber-500',
    },
    {
        id: 'func_avisos',
        titulo: 'Avisos Mercancía',
        subtitulo: 'Cruce automático de inventario.',
        permiso: 'funciones.avisos',
        href: () => '/funciones.avisos.index',
        icon: FileSignature,
        borderClass: 'border-cyan-500/20',
        iconWrapClass: 'bg-cyan-500/10 border-cyan-500/20',
        iconClass: 'text-cyan-500',
    },
    {
        id: 'func_gastos',
        titulo: 'Depuración Gastos',
        subtitulo: 'Descarta artículos irrelevantes.',
        permiso: 'funciones.gastos',
        href: () => '/funciones.gastos.index',
        icon: DollarSign,
        borderClass: 'border-green-500/20',
        iconWrapClass: 'bg-green-500/10 border-green-500/20',
        iconClass: 'text-green-500',
    },
    {
        id: 'func_limpieza_archivos',
        titulo: 'Limpieza Archivos',
        subtitulo: 'Remueve apóstrofes y formatos.',
        permiso: 'funciones.limpieza_archivos',
        href: () => '/funciones.limpieza_archivos.index',
        icon: FileSpreadsheet,
        borderClass: 'border-blue-500/20',
        iconWrapClass: 'bg-blue-500/10 border-blue-500/20',
        iconClass: 'text-blue-500',
    },
    {
        id: 'func_transacciones',
        titulo: 'Depuración Transacciones',
        subtitulo: 'Limpia saltos de línea internos.',
        permiso: 'funciones.transacciones',
        href: () => '/funciones.transacciones.index',
        icon: Receipt,
        borderClass: 'border-indigo-500/20',
        iconWrapClass: 'bg-indigo-500/10 border-indigo-500/20',
        iconClass: 'text-indigo-500',
    },
]

export const DASHBOARD_MODULE_CARDS: DashboardCardDef[] = RAW_MODULE_CARDS.map((card) => enrichCard({
  ...card,
  href: card.href as () => string,
}))

export const DASHBOARD_FUNCTION_CARDS: DashboardCardDef[] = RAW_FUNCTION_CARDS.map((card) => enrichCard({
  ...card,
  href: card.href as () => string,
}))

export function isDashboardCardVisible(
  card: DashboardCardDef,
  can: (permission: string) => boolean,
  geliaAiVisible = false,
) {
  if (card.accesoGeliaAi) return geliaAiVisible
  if (card.permisoAny?.length) return card.permisoAny.some((perm) => can(perm))
  if (card.permiso) return can(card.permiso)
  return true
}

export function filterVisibleDashboardCards(
  cards: DashboardCardDef[],
  can: (permission: string) => boolean,
  geliaAiVisible = false,
) {
  return cards.filter((card) => isDashboardCardVisible(card, can, geliaAiVisible))
}
