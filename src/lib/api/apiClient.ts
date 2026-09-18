export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  token?: string
  scopeVersion?: string
}

function apiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '')
  if (!configured) throw new ApiError('La URL de GELIA no está configurada.', 0)
  return configured
}

function errorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  if (status === 401) return 'Las credenciales no son válidas.'
  if (status === 403) return 'Tu usuario no tiene acceso a la aplicación móvil.'
  if (status === 422) return 'Revisa los datos enviados.'
  return 'GELIA no pudo completar la solicitud.'
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)
  if (options.scopeVersion) headers.set('X-Mobile-Scope-Version', options.scopeVersion)

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError('No fue posible conectar con GELIA. Revisa tu conexión.', 0)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok) throw new ApiError(errorMessage(payload, response.status), response.status, payload)
  return payload as T
}
