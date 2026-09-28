import { Preferences } from '@capacitor/preferences'
import type { MobileSession } from '../../features/auth/auth.types'
import { borrarTokenSeguro, guardarTokenSeguro, leerTokenSeguro, usaAlmacenSeguro } from './secureToken'

const LEGACY_SESSION_KEY = 'gelia:mobile:session:v1'
const DEVICE_KEY = 'gelia:mobile:device:v1'
const PROFILE_KEY = 'gelia:mobile:profile:v2'
const MIGRATED_KEY = 'gelia:mobile:session:migrated:v2'
const WEB_SESSION_KEY = 'gelia:web:session:v1'
const WEB_DEVICE_KEY = 'gelia:web:device:v1'

type StoredProfile = Omit<MobileSession, 'accessToken'>

let sessionCache: MobileSession | null = null
let deviceCache: string | null = null
let sessionGeneration = 0
let hydratePromise: Promise<MobileSession | null> | null = null

function readWeb(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeWeb(key: string, value: string) {
  localStorage.setItem(key, value)
}

function removeWeb(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* modo privado */
  }
}

function readTab(key: string) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeTab(key: string, value: string) {
  sessionStorage.setItem(key, value)
}

function removeTab(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* modo privado */
  }
}

function borrarCopiasWebView() {
  removeWeb(LEGACY_SESSION_KEY)
  removeWeb(DEVICE_KEY)
  removeWeb(WEB_SESSION_KEY)
  removeTab(WEB_SESSION_KEY)
}

function parseSession(raw: string): MobileSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<MobileSession>
    if (!parsed.accessToken || !parsed.user || !parsed.scopeVersion || !parsed.device) return null
    return {
      accessToken: parsed.accessToken,
      tokenType: 'Bearer',
      expiresAt: parsed.expiresAt ?? '',
      scopeVersion: parsed.scopeVersion,
      user: parsed.user,
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
      temaVisual: parsed.temaVisual ?? {},
      device: parsed.device,
      catalogAuthorizedAt: typeof parsed.catalogAuthorizedAt === 'string' ? parsed.catalogAuthorizedAt : '',
      catalogBlocked: parsed.catalogBlocked === true,
    }
  } catch {
    return null
  }
}

function profileFrom(session: MobileSession): StoredProfile {
  return {
    tokenType: session.tokenType,
    expiresAt: session.expiresAt,
    scopeVersion: session.scopeVersion,
    user: session.user,
    permissions: session.permissions,
    temaVisual: session.temaVisual,
    device: session.device,
    catalogAuthorizedAt: session.catalogAuthorizedAt,
    catalogBlocked: session.catalogBlocked,
  }
}

async function borrarSecretoNativo() {
  await borrarTokenSeguro().catch(() => undefined)
  await Preferences.remove({ key: PROFILE_KEY })
  await Preferences.remove({ key: LEGACY_SESSION_KEY })
  borrarCopiasWebView()
}

async function leerSesionNativa(): Promise<MobileSession | null> {
  const [token, profilePref] = await Promise.all([
    leerTokenSeguro(),
    Preferences.get({ key: PROFILE_KEY }),
  ])
  if (!token || !profilePref.value) return null
  const profile = parseSession(JSON.stringify({ ...JSON.parse(profilePref.value) as StoredProfile, accessToken: token }))
  if (!profile || profile.accessToken !== token) return null
  return profile
}

async function escribirSesionNativa(session: MobileSession) {
  await guardarTokenSeguro(session.accessToken)
  await Preferences.set({ key: PROFILE_KEY, value: JSON.stringify(profileFrom(session)) })
  borrarCopiasWebView()
  await Preferences.remove({ key: LEGACY_SESSION_KEY })
}

async function migrarSesionNativa(legacyRaw: string | null) {
  if (!legacyRaw) {
    await Preferences.set({ key: MIGRATED_KEY, value: '1' })
    borrarCopiasWebView()
    return null
  }

  const legacy = parseSession(legacyRaw)
  if (!legacy) {
    await borrarSecretoNativo()
    await Preferences.set({ key: MIGRATED_KEY, value: '1' })
    return null
  }

  try {
    await escribirSesionNativa(legacy)
    const verified = await leerSesionNativa()
    if (!verified || verified.accessToken !== legacy.accessToken) {
      throw new Error('La sesión migrada no coincide.')
    }
    borrarCopiasWebView()
    await Preferences.remove({ key: LEGACY_SESSION_KEY })
    await Preferences.set({ key: MIGRATED_KEY, value: '1' })
    return verified
  } catch {
    await borrarSecretoNativo()
    await Preferences.set({ key: MIGRATED_KEY, value: '1' })
    return null
  }
}

async function hidratarNativo(): Promise<MobileSession | null> {
  const migrated = await Preferences.get({ key: MIGRATED_KEY })
  if (migrated.value !== '1') {
    const legacyPref = await Preferences.get({ key: LEGACY_SESSION_KEY })
    const legacyRaw = legacyPref.value ?? readWeb(LEGACY_SESSION_KEY)
    return migrarSesionNativa(legacyRaw)
  }

  try {
    const session = await leerSesionNativa()
    borrarCopiasWebView()
    if (session) return session
    await borrarSecretoNativo()
    return null
  } catch {
    await borrarSecretoNativo()
    return null
  }
}

function hidratarWeb(): MobileSession | null {
  const current = readTab(WEB_SESSION_KEY)
  if (current) {
    const session = parseSession(current)
    if (session) {
      removeWeb(LEGACY_SESSION_KEY)
      return session
    }
    removeTab(WEB_SESSION_KEY)
  }

  const legacy = readWeb(LEGACY_SESSION_KEY)
  if (!legacy) return null
  const session = parseSession(legacy)
  removeWeb(LEGACY_SESSION_KEY)
  if (!session) return null
  writeTab(WEB_SESSION_KEY, JSON.stringify(session))
  return session
}

async function hidratar(): Promise<MobileSession | null> {
  const session = usaAlmacenSeguro() ? await hidratarNativo() : hidratarWeb()
  sessionCache = session
  return session
}

export function hydrateStorage() {
  if (!hydratePromise) hydratePromise = hidratar()
  return hydratePromise
}

export async function writeSession(session: MobileSession) {
  const generation = sessionGeneration
  try {
    if (usaAlmacenSeguro()) await escribirSesionNativa(session)
    else writeTab(WEB_SESSION_KEY, JSON.stringify(session))
  } catch {
    if (usaAlmacenSeguro()) await borrarSecretoNativo()
    else removeTab(WEB_SESSION_KEY)
    if (generation === sessionGeneration) sessionCache = null
    return false
  }

  if (generation !== sessionGeneration) {
    if (usaAlmacenSeguro()) await borrarSecretoNativo()
    else removeTab(WEB_SESSION_KEY)
    return false
  }

  sessionCache = session
  return true
}

export async function clearSession() {
  sessionGeneration += 1
  sessionCache = null
  if (usaAlmacenSeguro()) await borrarSecretoNativo()
  else {
    removeTab(WEB_SESSION_KEY)
    removeWeb(LEGACY_SESSION_KEY)
  }
}

export function peekSession() {
  return sessionCache
}

export async function getOrCreateDeviceUuid() {
  if (deviceCache) return deviceCache

  if (!usaAlmacenSeguro()) {
    const stored = readWeb(WEB_DEVICE_KEY) ?? readWeb(DEVICE_KEY)
    if (stored) {
      deviceCache = stored
      writeWeb(WEB_DEVICE_KEY, stored)
      removeWeb(DEVICE_KEY)
      return stored
    }
    const uuid = crypto.randomUUID()
    deviceCache = uuid
    writeWeb(WEB_DEVICE_KEY, uuid)
    return uuid
  }

  const pref = await Preferences.get({ key: DEVICE_KEY })
  if (pref.value) {
    deviceCache = pref.value
    removeWeb(DEVICE_KEY)
    return pref.value
  }

  const legacy = readWeb(DEVICE_KEY)
  const uuid = legacy || crypto.randomUUID()
  await Preferences.set({ key: DEVICE_KEY, value: uuid })
  removeWeb(DEVICE_KEY)
  deviceCache = uuid
  return uuid
}
