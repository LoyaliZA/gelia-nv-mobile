const SUPER_ADMIN_PERMISSION = '*'

export function createCan(permissions: string[]) {
  const set = new Set(permissions)
  const isSuperAdmin = set.has(SUPER_ADMIN_PERMISSION)

  return (permission: string) => isSuperAdmin || set.has(permission)
}

export function hasAnyPermission(permissions: string[], keys: string[]) {
  const can = createCan(permissions)
  return keys.some((key) => can(key))
}
