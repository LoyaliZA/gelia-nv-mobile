import type { TemaVisual } from '../features/auth/auth.types'

const ACCENT_COLORS: Record<string, string> = {
  rosa: '#ec4899', azul: '#3b82f6', verde: '#10b981', amarillo: '#f59e0b',
}

const FONT_FAMILIES: Record<string, string> = {
  inter: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  montserrat: "Montserrat, system-ui, sans-serif",
  poppins: "Poppins, system-ui, sans-serif",
}

function normalizeScale(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.min(1.2, Math.max(0.88, parsed))
}

export function applyGeliaTheme(theme: TemaVisual = {}) {
  const root = document.documentElement
  const colorName = String(theme.color_nombre || 'rosa').toLowerCase()
  const accent = colorName.startsWith('#') ? colorName : ACCENT_COLORS[colorName] || ACCENT_COLORS.rosa
  const fontName = String(theme.fuente_principal || 'inter').toLowerCase()
  const glassValue = String(theme.efecto_cristal ?? 'true')

  root.classList.toggle('dark', theme.modo !== 'light')
  root.classList.toggle('glass-active', glassValue !== 'false' && glassValue !== '0')
  root.dataset.density = String(theme.densidad_contenido || 'comfortable')
  root.style.setProperty('--color-primario', accent)
  root.style.setProperty('--font-principal', FONT_FAMILIES[fontName] || FONT_FAMILIES.inter)
  root.style.setProperty('--font-scale', String(normalizeScale(theme.escala_fuente)))
}

export function clearGeliaTheme() {
  const root = document.documentElement
  root.classList.add('dark')
  root.classList.add('glass-active')
  delete root.dataset.density
  root.style.setProperty('--color-primario', ACCENT_COLORS.rosa)
  root.style.setProperty('--font-principal', FONT_FAMILIES.inter)
  root.style.setProperty('--font-scale', '1')
}
