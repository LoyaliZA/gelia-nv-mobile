import { Briefcase, Home, LayoutDashboard, Search } from 'lucide-react'
import type { SidebarNode } from './navTypes'

/** Navegación móvil: solo opciones disponibles en la app. */
export function buildMobileNavigation(): SidebarNode[] {
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
    {
      type: 'group',
      id: 'operaciones',
      label: 'Operaciones',
      icon: Briefcase,
      defaultOpen: true,
      children: [
        {
          type: 'link',
          id: 'consultar_clientes',
          label: 'Consultar Clientes',
          icon: Search,
          href: () => '/consultar-clientes',
          active: (url) => url.startsWith('/consultar-clientes'),
          mobileEnabled: true,
          mobileRoute: 'clientes',
        },
      ],
    },
  ]
}
