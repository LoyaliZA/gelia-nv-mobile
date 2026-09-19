export interface TemaVisual {
  modo?: 'dark' | 'light'
  color_nombre?: string
  color_hex?: string
  fondo_base?: string
  fuente_principal?: string
  escala_fuente?: number
  efecto_cristal?: boolean | number | string
  densidad_contenido?: string
  contenido_max_rem?: number
  contenido_padding_rem?: number
  layout_sidebar?: string
  layout_sidebar_mobile?: string
  sidebar_modo?: string
  [key: string]: unknown
}

export interface GeliaUser {
  id: number
  name: string
  username: string | null
  email: string | null
}

export interface MobileDevice {
  id: number
  device_uuid: string
  nombre: string | null
  plataforma: string | null
  app_version: string | null
  last_seen_at: string | null
}

export interface MobileSession {
  accessToken: string
  tokenType: 'Bearer'
  expiresAt: string
  scopeVersion: string
  user: GeliaUser
  permissions: string[]
  temaVisual: TemaVisual
  device: MobileDevice
}

export interface LoginCredentials {
  login: string
  password: string
}

export interface MobileLoginResponse {
  access_token: string
  token_type: 'Bearer'
  expires_at: string
  scope_version: string
  user: GeliaUser
  permissions: string[]
  tema_visual: TemaVisual
  device: MobileDevice
}

export interface MobileMeResponse {
  scope_version: string
  user: GeliaUser
  permissions: string[]
  tema_visual: TemaVisual
  device: MobileDevice
}

export interface PasskeyCredentialSummary {
  id: string
  nickname: string | null
  platform: string | null
  transports: string[] | null
  last_used_at: string | null
  revocado_at: string | null
  created_at: string | null
}
