import { Capacitor } from '@capacitor/core'
import { apiRequest } from '../../lib/api/apiClient'
import { getOrCreateDeviceUuid } from '../../services/storage/sessionStorage'
import type { LoginCredentials, MobileLoginResponse, MobileMeResponse, MobileSession } from './auth.types'

function deviceName() {
  return Capacitor.isNativePlatform() ? 'GELIA Móvil' : 'Navegador de desarrollo'
}

export async function loginMobile(credentials: LoginCredentials): Promise<MobileSession> {
  const response = await apiRequest<MobileLoginResponse>('/mobile/login', {
    method: 'POST',
    body: {
      ...credentials,
      device_uuid: getOrCreateDeviceUuid(),
      device_name: deviceName(),
      platform: Capacitor.getPlatform(),
      app_version: import.meta.env.VITE_APP_VERSION || '0.1.0',
    },
  })

  return {
    accessToken: response.access_token,
    tokenType: response.token_type,
    expiresAt: response.expires_at,
    scopeVersion: response.scope_version,
    user: response.user,
    permissions: response.permissions,
    temaVisual: response.tema_visual,
    device: response.device,
  }
}

export async function fetchMobileMe(session: MobileSession): Promise<MobileSession> {
  const response = await apiRequest<MobileMeResponse>('/mobile/me', { token: session.accessToken })
  return {
    ...session,
    scopeVersion: response.scope_version,
    user: response.user,
    permissions: response.permissions,
    temaVisual: response.tema_visual,
    device: response.device,
  }
}

export async function logoutMobile(session: MobileSession) {
  await apiRequest<{ message: string }>('/mobile/logout', {
    method: 'POST',
    token: session.accessToken,
  })
}
