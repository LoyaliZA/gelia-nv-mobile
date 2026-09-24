import type { AppRoute } from '../app/routes'

/** Pseudo-URL usada por active() del menú móvil. */
export function routeToNavUrl(route: AppRoute): string {
  const map: Record<AppRoute, string> = {
    inicio: '/dashboard',
    clientes: '/consultar-clientes',
    perfil: '/perfil',
    preferencias: '/perfil/preferencias',
  }
  return map[route]
}

/** IDs habilitados en la app móvil (sidebar legacy / catálogo). */
const MOBILE_ENABLED_IDS = new Set(['dashboard', 'consultar_clientes', 'card_consultar_clientes'])

const MOBILE_ROUTE_BY_ID: Partial<Record<string, AppRoute>> = {
  dashboard: 'inicio',
  consultar_clientes: 'clientes',
  card_consultar_clientes: 'clientes',
}

export function getMobileRouteForLink(id: string): AppRoute | null {
  return MOBILE_ROUTE_BY_ID[id] ?? null
}

export function isMobileLinkEnabled(id: string): boolean {
  return MOBILE_ENABLED_IDS.has(id)
}
