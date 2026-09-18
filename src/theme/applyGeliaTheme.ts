import type { TemaVisual } from '../features/auth/auth.types'
import { geliaOrigin, resolveGeliaAssetUrl } from '../lib/geliaAssets'
import { applyContentDensityToRoot } from '../utils/contentDensity'
import { clampFontScale } from '../utils/fontScale'

const ACCENT_COLORS: Record<string, string> = {
  rosa: '#ec4899',
  azul: '#3b82f6',
  verde: '#10b981',
  amarillo: '#f59e0b',
}

const FONT_FAMILIES: Record<string, string> = {
  inter: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  montserrat: "Montserrat, system-ui, sans-serif",
  poppins: "Poppins, system-ui, sans-serif",
  nunito: "Nunito, system-ui, sans-serif",
  roboto: "Roboto, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

function resolveAccentColor(theme: TemaVisual): string {
  const colorHex = typeof theme.color_hex === 'string' ? theme.color_hex.trim() : ''
  if (colorHex.startsWith('#')) return colorHex

  const colorName = String(theme.color_nombre || 'rosa').toLowerCase()
  if (colorName.startsWith('#')) return colorName
  return ACCENT_COLORS[colorName] || ACCENT_COLORS.rosa
}

function resolveBackgroundImages(fondoBase: string) {
  if (!fondoBase || fondoBase === 'none') {
    return { pc: 'none', mobile: 'none' }
  }

  if (fondoBase.startsWith('#')) {
    const gradient = `linear-gradient(to right, ${fondoBase}, ${fondoBase})`
    return { pc: gradient, mobile: gradient }
  }

  if (fondoBase.startsWith('data:image') || fondoBase.startsWith('/storage') || fondoBase.startsWith('http')) {
    const url = resolveGeliaAssetUrl(fondoBase)
    return { pc: `url(${url})`, mobile: `url(${url})` }
  }

  const origin = geliaOrigin()
  if (!origin) return { pc: 'none', mobile: 'none' }

  return {
    pc: `url(${origin}/assets/backgrounds/${fondoBase}_pc.svg)`,
    mobile: `url(${origin}/assets/backgrounds/${fondoBase}_movil.svg)`,
  }
}

export function applyGeliaTheme(theme: TemaVisual = {}) {
  const root = document.documentElement
  const accent = resolveAccentColor(theme)
  const fontName = String(theme.fuente_principal || 'inter').toLowerCase()
  const glassValue = String(theme.efecto_cristal ?? 'true')
  const fondoBase = String(theme.fondo_base || 'none')

  root.classList.toggle('dark', theme.modo !== 'light')
  root.classList.toggle('glass-active', glassValue !== 'false' && glassValue !== '0')

  root.style.setProperty('--color-primario', accent)
  root.style.setProperty('--font-principal', FONT_FAMILIES[fontName] || FONT_FAMILIES.inter)
  root.style.setProperty('--font-scale', String(clampFontScale(theme.escala_fuente)))

  const backgrounds = resolveBackgroundImages(fondoBase)
  root.style.setProperty('--bg-image-pc', backgrounds.pc)
  root.style.setProperty('--bg-image-movil', backgrounds.mobile)

  applyContentDensityToRoot(theme)
}

export function clearGeliaTheme() {
  const root = document.documentElement

  root.classList.add('dark')
  root.classList.add('glass-active')
  delete root.dataset.density

  root.style.setProperty('--color-primario', ACCENT_COLORS.rosa)
  root.style.setProperty('--font-principal', FONT_FAMILIES.inter)
  root.style.setProperty('--font-scale', '1')
  root.style.setProperty('--bg-image-pc', 'none')
  root.style.setProperty('--bg-image-movil', 'none')
  root.style.setProperty('--gelia-content-max', '52rem')
  root.style.setProperty('--gelia-main-padding-x', '1rem')
  root.style.setProperty('--gelia-page-shell-padding-block', '1.4rem')
  root.style.setProperty('--gelia-page-shell-padding-inline', '1rem')
}
