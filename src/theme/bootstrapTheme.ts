import { readSession } from '../services/storage/sessionStorage'
import { applyGeliaTheme } from './applyGeliaTheme'

/** Aplica el tema almacenado antes del primer render para evitar flash de color por defecto. */
export function bootstrapGeliaTheme() {
  const stored = readSession()
  if (stored?.temaVisual) {
    applyGeliaTheme(stored.temaVisual)
  }
}
