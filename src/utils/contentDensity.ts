import type { TemaVisual } from '../features/auth/auth.types'

export const CONTENT_DENSITY_MODES = ['compacto', 'completo', 'personalizado'] as const
export const CONTENT_DENSITY_DEFAULT = 'compacto'

export const CONTENT_MAX_REM_DEFAULT = 87.5
export const CONTENT_PADDING_REM_DEFAULT = 1.25

const PRESETS = {
  compacto: {
    contentMaxRem: 87.5,
    paddingRem: 1.25,
    shellPaddingBlock: 'clamp(0.75rem, 2vw, 1.5rem)',
    shellPaddingInline: 'clamp(0.75rem, 2vw, 1.5rem)',
  },
  completo: {
    contentMaxRem: null,
    paddingRem: 0.625,
    shellPaddingBlock: 'clamp(0.5rem, 1.5vw, 1rem)',
    shellPaddingInline: 'clamp(0.375rem, 1vw, 0.75rem)',
  },
} as const

function clampContentMaxRem(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return CONTENT_MAX_REM_DEFAULT
  const stepped = Math.round(parsed / 2.5) * 2.5
  return Math.min(120, Math.max(60, stepped))
}

function clampContentPaddingRem(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return CONTENT_PADDING_REM_DEFAULT
  const stepped = Math.round(parsed / 0.125) * 0.125
  return Math.min(2, Math.max(0.5, stepped))
}

export function normalizeDensityMode(value: unknown): string {
  const mode = String(value ?? CONTENT_DENSITY_DEFAULT)
  return CONTENT_DENSITY_MODES.includes(mode as typeof CONTENT_DENSITY_MODES[number])
    ? mode
    : CONTENT_DENSITY_DEFAULT
}

export function resolveContentDensity(temaVisual: TemaVisual = {}) {
  const modo = normalizeDensityMode(temaVisual.densidad_contenido)
  const customMaxRem = clampContentMaxRem(temaVisual.contenido_max_rem ?? CONTENT_MAX_REM_DEFAULT)
  const customPaddingRem = clampContentPaddingRem(temaVisual.contenido_padding_rem ?? CONTENT_PADDING_REM_DEFAULT)

  if (modo === 'completo') {
    const preset = PRESETS.completo
    return {
      modo,
      contentMax: '100%',
      paddingRem: preset.paddingRem,
      shellPaddingBlock: preset.shellPaddingBlock,
      shellPaddingInline: preset.shellPaddingInline,
    }
  }

  if (modo === 'personalizado') {
    return {
      modo,
      contentMax: `${customMaxRem}rem`,
      paddingRem: customPaddingRem,
      shellPaddingBlock: `clamp(0.5rem, 2vw, ${Math.max(customPaddingRem, 0.75)}rem)`,
      shellPaddingInline: `clamp(0.375rem, 1.5vw, ${customPaddingRem}rem)`,
    }
  }

  const preset = PRESETS.compacto
  return {
    modo: 'compacto',
    contentMax: `${preset.contentMaxRem}rem`,
    paddingRem: preset.paddingRem,
    shellPaddingBlock: preset.shellPaddingBlock,
    shellPaddingInline: preset.shellPaddingInline,
  }
}

export function applyContentDensityToRoot(temaVisual: TemaVisual = {}) {
  const density = resolveContentDensity(temaVisual)
  const root = document.documentElement

  root.style.setProperty('--gelia-content-max', density.contentMax)
  root.style.setProperty('--gelia-main-padding-x', `${density.paddingRem}rem`)
  root.style.setProperty('--gelia-page-shell-padding-block', density.shellPaddingBlock)
  root.style.setProperty('--gelia-page-shell-padding-inline', density.shellPaddingInline)
  root.dataset.density = density.modo

  return density
}
