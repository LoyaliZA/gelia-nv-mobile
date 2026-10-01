export function createIdempotencyKey(prefix: string, resource?: number | string) {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`

  const resourcePart = resource === undefined ? '' : `:${resource}`
  return `${prefix}${resourcePart}:${random}`.slice(0, 64)
}
