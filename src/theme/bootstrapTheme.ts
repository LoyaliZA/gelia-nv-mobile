import { hydrateStorage } from '../services/storage/sessionStorage'
import { applyGeliaTheme } from './applyGeliaTheme'

/** Aplica el tema almacenado antes del primer render para evitar flash de color por defecto. */
export async function bootstrapGeliaTheme() {
  const stored = await hydrateStorage()
  if (stored?.temaVisual) applyGeliaTheme(stored.temaVisual)
}
