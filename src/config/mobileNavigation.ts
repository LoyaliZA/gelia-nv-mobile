import { Briefcase, CalendarClock, Home, LayoutDashboard, Package, Search, Store, Ticket, User } from 'lucide-react'
import { puedeConsultarClientesMovil } from '../features/clientes/mobileClienteAccess'
import {
  puedeAbrirRecepcionTurnosMovil,
  puedeVerResguardosMovil,
  puedeVerVisitasProgramadasMovil,
} from '../features/puntoVenta/puntoVentaAccess'
import type { SidebarLinkNode, SidebarNode } from './navTypes'

/** Navegación móvil: módulo principal, submódulo y opción, como el sidebar profesional. */
export function buildMobileNavigation(permissions: string[] = []): SidebarNode[] {
  const comercialLinks: SidebarLinkNode[] = []
  const puntoVentaLinks: SidebarLinkNode[] = []

  if (puedeConsultarClientesMovil(permissions)) {
    comercialLinks.push({
      type: 'link',
      id: 'consultar_clientes',
      label: 'Consultar Clientes',
      icon: Search,
      href: () => '/consultar-clientes',
      active: (url) => url.startsWith('/consultar-clientes'),
      mobileEnabled: true,
      mobileRoute: 'clientes',
    })
  }

  if (puedeVerResguardosMovil(permissions)) {
    puntoVentaLinks.push({
      type: 'link',
      id: 'resguardos_pdv',
      label: 'Resguardos',
      icon: Package,
      href: () => '/punto-venta/resguardos',
      active: (url) => url.startsWith('/punto-venta/resguardos'),
      mobileEnabled: true,
      mobileRoute: 'resguardos',
    })
  }

  if (puedeAbrirRecepcionTurnosMovil(permissions)) {
    puntoVentaLinks.push({
      type: 'link',
      id: 'turnos_recepcion',
      label: 'Recepción turnos',
      icon: Ticket,
      href: () => '/punto-venta/turnos/recepcion',
      active: (url) => url.startsWith('/punto-venta/turnos'),
      mobileEnabled: true,
      mobileRoute: 'turnos',
    })
  }

  if (puedeVerVisitasProgramadasMovil(permissions)) {
    puntoVentaLinks.push({
      type: 'link',
      id: 'visitas_programadas_pdv',
      label: 'Visitas del día',
      icon: CalendarClock,
      href: () => '/punto-venta/visitas-programadas',
      active: (url) => url.startsWith('/punto-venta/visitas-programadas'),
      mobileEnabled: true,
      mobileRoute: 'visitas',
    })
  }

  return [
    {
      type: 'group',
      id: 'inicio',
      label: 'Inicio',
      icon: Home,
      defaultOpen: true,
      children: [
        {
          type: 'link',
          id: 'dashboard',
          label: 'Panel Principal',
          icon: LayoutDashboard,
          href: () => '/dashboard',
          active: (url) => url === '/dashboard',
          mobileEnabled: true,
          mobileRoute: 'inicio',
        },
      ],
    },
    ...(comercialLinks.length > 0 ? [{
      type: 'group' as const,
      id: 'operaciones',
      label: 'Operaciones',
      icon: Briefcase,
      defaultOpen: true,
      children: [
        {
          type: 'group' as const,
          id: 'comercial',
          label: 'Comercial',
          icon: User,
          children: comercialLinks,
        },
      ],
    }] : []),
    ...(puntoVentaLinks.length > 0 ? [{
      type: 'group' as const,
      id: 'punto_venta',
      label: 'Punto de venta',
      icon: Store,
      children: puntoVentaLinks,
    }] : []),
  ]
}
