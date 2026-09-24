import { useEffect, useState } from 'react'

export type AppRoute = 'inicio' | 'clientes' | 'perfil' | 'preferencias'

const ROUTES: Record<string, AppRoute> = {
  '#/inicio': 'inicio',
  '#/clientes': 'clientes',
  '#/perfil': 'perfil',
  '#/preferencias': 'preferencias',
}

function readRoute(): AppRoute {
  return ROUTES[window.location.hash] ?? 'inicio'
}

export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(readRoute)

  useEffect(() => {
    const handleHashChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigate = (nextRoute: AppRoute) => {
    const nextHash = `#/${nextRoute}`
    if (window.location.hash === nextHash) {
      setRoute(nextRoute)
      return
    }
    window.location.hash = nextHash
  }

  return { route, navigate }
}
