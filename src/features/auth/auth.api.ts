import { Capacitor } from '@capacitor/core'
import { CapacitorPasskey } from '@capgo/capacitor-passkey'
import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser'
import { apiRequest } from '../../lib/api/apiClient'
import { APP_VERSION } from '../../config/appVersion'
import { getOrCreateDeviceUuid } from '../../services/storage/sessionStorage'
import type {
  LoginCredentials,
  MobileLoginResponse,
  MobileMeResponse,
  MobileSession,
  PasskeyCredentialSummary,
} from './auth.types'

function deviceName() {
  return Capacitor.isNativePlatform() ? 'GELIA Móvil' : 'Navegador de desarrollo'
}

const loginRequest = {
  retries: 0,
  retryOn429: false,
  rateLimitScope: 'login' as const,
}

async function devicePayload() {
  return {
    device_uuid: await getOrCreateDeviceUuid(),
    device_name: deviceName(),
    platform: Capacitor.getPlatform(),
    app_version: APP_VERSION,
  }
}

function sessionFromLogin(response: MobileLoginResponse): MobileSession {
  return {
    accessToken: response.access_token,
    tokenType: response.token_type,
    expiresAt: response.expires_at,
    scopeVersion: response.scope_version,
    es_demo: response.es_demo === true,
    user: response.user,
    permissions: response.permissions,
    temaVisual: response.tema_visual,
    device: response.device,
    catalogAuthorizedAt: new Date().toISOString(),
    catalogBlocked: false,
  }
}

function hexToBase64Url(hex: string) {
  const normalized = hex.replace(/-/g, '')
  const bytes = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16)
  }
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function webAuthnSoportado() {
  return typeof window !== 'undefined' && browserSupportsWebAuthn()
}

export async function webAuthnSoportadoAsync() {
  if (typeof window === 'undefined') return false
  if (Capacitor.isNativePlatform()) {
    try {
      const soporte = await CapacitorPasskey.isSupported()
      return soporte.available
    } catch {
      return webAuthnSoportado()
    }
  }
  return webAuthnSoportado()
}

export async function loginMobile(credentials: LoginCredentials): Promise<MobileSession> {
  const response = await apiRequest<MobileLoginResponse>('/mobile/login', {
    method: 'POST',
    body: {
      ...credentials,
      ...await devicePayload(),
    },
    ...loginRequest,
  })

  return sessionFromLogin(response)
}

export async function fetchMobileMe(session: MobileSession): Promise<MobileSession> {
  const response = await apiRequest<MobileMeResponse>('/mobile/me', { token: session.accessToken })
  return {
    ...session,
    scopeVersion: response.scope_version,
    es_demo: response.es_demo === true,
    user: response.user,
    permissions: response.permissions,
    temaVisual: response.tema_visual,
    device: response.device,
    catalogAuthorizedAt: new Date().toISOString(),
    catalogBlocked: false,
  }
}

export async function logoutMobile(session: MobileSession) {
  await apiRequest<{ message: string }>('/mobile/logout', {
    method: 'POST',
    token: session.accessToken,
  })
}

export async function passkeyLoginOptions(login: string) {
  return apiRequest<PublicKeyCredentialRequestOptionsJSON>('/passkeys/login/options', {
    method: 'POST',
    body: {
      login,
      client: 'mobile',
      device_uuid: await getOrCreateDeviceUuid(),
    },
    ...loginRequest,
  })
}

export async function loginWithPasskey(login: string): Promise<MobileSession> {
  const optionsJSON = await passkeyLoginOptions(login)
  const credential = await startAuthentication({ optionsJSON })
  const response = await apiRequest<MobileLoginResponse>('/passkeys/login/verify', {
    method: 'POST',
    body: {
      login,
      client: 'mobile',
      ...await devicePayload(),
      credential,
    },
    ...loginRequest,
  })
  return sessionFromLogin(response)
}

export async function registerPasskey(session: MobileSession, nickname?: string) {
  const optionsJSON = await apiRequest<PublicKeyCredentialCreationOptionsJSON>('/passkeys/register/options', {
    method: 'POST',
    token: session.accessToken,
    body: {
      client: 'mobile',
      nickname,
      platform: Capacitor.getPlatform(),
      device_uuid: await getOrCreateDeviceUuid(),
    },
  })

  let opciones = optionsJSON
  if (/^[0-9a-f-]{32,36}$/i.test(optionsJSON.user.id)) {
    opciones = {
      ...optionsJSON,
      user: {
        ...optionsJSON.user,
        id: hexToBase64Url(optionsJSON.user.id),
      },
    }
  }

  const credential = await startRegistration({ optionsJSON: opciones })
  return apiRequest<PasskeyCredentialSummary>('/passkeys/register', {
    method: 'POST',
    token: session.accessToken,
    body: {
      client: 'mobile',
      nickname,
      platform: Capacitor.getPlatform(),
      device_uuid: await getOrCreateDeviceUuid(),
      credential,
    },
  })
}

export async function listPasskeys(session: MobileSession) {
  const response = await apiRequest<{ data: PasskeyCredentialSummary[] }>('/passkeys', {
    token: session.accessToken,
  })
  return response.data
}

export async function revokePasskey(session: MobileSession, id: string) {
  await apiRequest<{ message: string }>(`/passkeys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token: session.accessToken,
  })
}
