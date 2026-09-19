import { Preferences } from '@capacitor/preferences'
import type { MobileSession } from '../../features/auth/auth.types'

const SESSION_KEY = 'gelia:mobile:session:v1'
const DEVICE_KEY = 'gelia:mobile:device:v1'

let sessionCache: MobileSession | null | undefined
let deviceCache: string | null | undefined

function readLocal(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}

function removeLocal(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* private mode */
  }
}

export async function hydrateStorage() {
  const [sessionPref, devicePref] = await Promise.all([
    Preferences.get({ key: SESSION_KEY }),
    Preferences.get({ key: DEVICE_KEY }),
  ])

  const sessionRaw = sessionPref.value ?? readLocal(SESSION_KEY)
  if (sessionRaw) {
    try {
      sessionCache = JSON.parse(sessionRaw) as MobileSession
      if (!sessionPref.value) {
        await Preferences.set({ key: SESSION_KEY, value: sessionRaw })
      }
    } catch {
      sessionCache = null
      await Preferences.remove({ key: SESSION_KEY })
      removeLocal(SESSION_KEY)
    }
  } else {
    sessionCache = null
  }

  deviceCache = devicePref.value ?? readLocal(DEVICE_KEY)
  if (deviceCache && !devicePref.value) {
    await Preferences.set({ key: DEVICE_KEY, value: deviceCache })
  }
}

export function readSession(): MobileSession | null {
  if (sessionCache !== undefined) return sessionCache
  const raw = readLocal(SESSION_KEY)
  if (!raw) {
    sessionCache = null
    return null
  }
  try {
    sessionCache = JSON.parse(raw) as MobileSession
    return sessionCache
  } catch {
    removeLocal(SESSION_KEY)
    sessionCache = null
    return null
  }
}

export function writeSession(session: MobileSession) {
  sessionCache = session
  const raw = JSON.stringify(session)
  writeLocal(SESSION_KEY, raw)
  void Preferences.set({ key: SESSION_KEY, value: raw })
}

export function clearSession() {
  sessionCache = null
  removeLocal(SESSION_KEY)
  void Preferences.remove({ key: SESSION_KEY })
}

export function getOrCreateDeviceUuid() {
  if (deviceCache) return deviceCache
  const stored = readLocal(DEVICE_KEY)
  if (stored) {
    deviceCache = stored
    void Preferences.set({ key: DEVICE_KEY, value: stored })
    return stored
  }
  const uuid = crypto.randomUUID()
  deviceCache = uuid
  writeLocal(DEVICE_KEY, uuid)
  void Preferences.set({ key: DEVICE_KEY, value: uuid })
  return uuid
}
