import type { MobileSession } from '../../features/auth/auth.types'

const SESSION_KEY = 'gelia:mobile:session:v1'
const DEVICE_KEY = 'gelia:mobile:device:v1'

export function readSession(): MobileSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as MobileSession) : null
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function writeSession(session: MobileSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function getOrCreateDeviceUuid() {
  const stored = localStorage.getItem(DEVICE_KEY)
  if (stored) return stored
  const uuid = crypto.randomUUID()
  localStorage.setItem(DEVICE_KEY, uuid)
  return uuid
}
