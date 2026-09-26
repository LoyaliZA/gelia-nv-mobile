import { Briefcase, Home, LayoutDashboard, Search } from 'lucide-react'
import { puedeConsultarClientesMovil } from '../features/clientes/mobileClienteAccess'
import type { SidebarNode } from './navTypes'

/** Navegación móvil: solo opciones disponibles en la app. */
export function buildMobileNavigation(permissions: string[] = []): SidebarNode[] {
  const showClientes = puedeConsultarClientesMovil(permissions)

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
    ...(showClientes ? [{
      type: 'group' as const,
      id: 'operaciones',
      label: 'Operaciones',
      icon: Briefcase,
      defaultOpen: true,
      children: [
        {
          type: 'link' as const,
          id: 'consultar_clientes',
          label: 'Consultar Clientes',
          icon: Search,
          href: () => '/consultar-clientes',
          active: (url: string) => url.startsWith('/consultar-clientes'),
          mobileEnabled: true,
          mobileRoute: 'clientes' as const,
        },
      ],
    }] : []),
  ]
}
