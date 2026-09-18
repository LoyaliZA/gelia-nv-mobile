export const FONT_SCALE_MIN = 0.875
export const FONT_SCALE_MAX = 1.5
export const FONT_SCALE_STEP = 0.0625
export const FONT_SCALE_DEFAULT = 1

export function clampFontScale(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return FONT_SCALE_DEFAULT
  const stepped = Math.round(parsed / FONT_SCALE_STEP) * FONT_SCALE_STEP
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Number(stepped.toFixed(4))))
}
