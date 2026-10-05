import type { AppRoute } from '../../app/routes'

const STORAGE_KEY = 'gelia:movil:visita-focus'

export function setVisitaFocusId(visitaId: number) {
  sessionStorage.setItem(STORAGE_KEY, String(visitaId))
}

export function consumeVisitaFocusId(): number | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
  if (!raw) return null
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) ? id : null
}

export function navigateToVisitas(
  onNavigate: (route: AppRoute) => void,
  options?: { visitaId?: number },
) {
  if (options?.visitaId != null) {
    setVisitaFocusId(options.visitaId)
  }
  onNavigate('visitas')
}
