import { apiFormRequest, apiRequest } from '../../lib/api/apiClient'
import type { MobileMeResponse, MobileSession, TemaVisual } from '../auth/auth.types'

function sessionFromMeResponse(session: MobileSession, response: MobileMeResponse): MobileSession {
  return {
    ...session,
    scopeVersion: response.scope_version,
    user: response.user,
    permissions: response.permissions,
    temaVisual: response.tema_visual,
    device: response.device,
  }
}

export async function updateMobileTemaVisual(
  session: MobileSession,
  temaVisual: Partial<TemaVisual>,
): Promise<MobileSession> {
  const response = await apiRequest<MobileMeResponse>('/mobile/profile', {
    method: 'PATCH',
    token: session.accessToken,
    body: { tema_visual: temaVisual },
  })

  return sessionFromMeResponse(session, response)
}

export async function uploadProfilePhoto(session: MobileSession, file: File): Promise<MobileSession> {
  const formData = new FormData()
  formData.append('foto_perfil', file)

  const response = await apiFormRequest<MobileMeResponse>('/mobile/profile', formData, {
    token: session.accessToken,
  })

  return sessionFromMeResponse(session, response)
}

export async function removeProfilePhoto(session: MobileSession): Promise<MobileSession> {
  const response = await apiRequest<MobileMeResponse>('/mobile/profile', {
    method: 'PATCH',
    token: session.accessToken,
    body: { remove_foto: true },
  })

  return sessionFromMeResponse(session, response)
}
