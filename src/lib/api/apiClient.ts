import { Capacitor, CapacitorHttp } from '@capacitor/core'

export class ApiError extends Error {
  readonly status: number
  readonly details: unknown
  readonly retryAfterSeconds: number | null

  constructor(message: string, status: number, details?: unknown, retryAfterSeconds: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export const API_CONNECT_TIMEOUT_MS = 15_000
export const API_READ_TIMEOUT_MS = 45_000
export const API_SYNC_READ_TIMEOUT_MS = 120_000
export const API_MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 1_000
const RETRY_MAX_DELAY_MS = 60_000

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  token?: string
  scopeVersion?: string
  connectTimeoutMs?: number
  readTimeoutMs?: number
  retries?: number
  retryOn429?: boolean
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
  if (status === 429) return 'GELIA limitó temporalmente las solicitudes. La sincronización se reanudará sola.'
  return 'GELIA no pudo completar la solicitud.'
}

function headersRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((value, key) => { record[key] = value })
  return record
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isTransientStatus(status: number) {
  return status === 0 || status === 408 || status === 502 || status === 503 || status === 504
}

type ResponseHeaders = Headers | Record<string, string>

function headerValue(headers: ResponseHeaders, name: string): string | null {
  if (headers instanceof Headers) return headers.get(name)
  const target = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target && value.trim()) return value
  }
  return null
}

function parseRetryAfterSeconds(headers: ResponseHeaders): number | null {
  const raw = headerValue(headers, 'retry-after')
  if (!raw) return null
  const seconds = Number(raw)
  if (Number.isFinite(seconds)) return Math.max(0, seconds)
  const date = Date.parse(raw)
  if (Number.isFinite(date)) return Math.max(0, Math.round((date - Date.now()) / 1000))
  return null
}

function normalizeHeaderRecord(headers: unknown): Record<string, string> {
  if (!headers || typeof headers !== 'object') return {}
  const record: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (typeof value === 'string') record[key] = value
    else if (Array.isArray(value) && typeof value[0] === 'string') record[key] = value[0]
  }
  return record
}

function connectionErrorMessage(cause?: unknown) {
  if (cause instanceof DOMException && cause.name === 'AbortError') {
    return 'La solicitud tardó demasiado. Revisa tu conexión.'
  }
  return 'No fue posible conectar con GELIA. Revisa tu conexión.'
}

async function requestWithNativeHttp(
  url: string,
  method: string,
  headers: Headers,
  body: string | undefined,
  timeouts: { connectTimeoutMs: number; readTimeoutMs: number },
) {
  const response = await CapacitorHttp.request({
    url,
    method,
    headers: headersRecord(headers),
    data: body === undefined ? undefined : JSON.parse(body),
    connectTimeout: timeouts.connectTimeoutMs,
    readTimeout: timeouts.readTimeoutMs,
  })
  return { status: response.status, payload: response.data, headers: normalizeHeaderRecord(response.headers) }
}

async function requestWithFetch(
  url: string,
  method: string,
  headers: Headers,
  body: string | undefined,
  timeouts: { connectTimeoutMs: number; readTimeoutMs: number },
) {
  const controller = new AbortController()
  const timeoutMs = timeouts.connectTimeoutMs + timeouts.readTimeoutMs
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    })
    window.clearTimeout(timeoutId)

    const contentType = response.headers.get('content-type') ?? ''
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '')

    return { status: response.status, payload, headers: response.headers }
  } catch (error) {
    window.clearTimeout(timeoutId)
    throw new ApiError(connectionErrorMessage(error), 0)
  }
}

async function performRequest(
  path: string,
  options: ApiRequestOptions,
  timeouts: { connectTimeoutMs: number; readTimeoutMs: number },
) {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)
  if (options.scopeVersion) headers.set('X-Mobile-Scope-Version', options.scopeVersion)

  const method = (options.method ?? 'GET').toUpperCase()
  const body = options.body === undefined ? undefined : JSON.stringify(options.body)
  const url = `${apiBaseUrl()}${path}`

  try {
    if (Capacitor.isNativePlatform()) {
      return await requestWithNativeHttp(url, method, headers, body, timeouts)
    }
    return await requestWithFetch(url, method, headers, body, timeouts)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(connectionErrorMessage(error), 0)
  }
}

async function executeRequest<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const timeouts = {
    connectTimeoutMs: options.connectTimeoutMs ?? API_CONNECT_TIMEOUT_MS,
    readTimeoutMs: options.readTimeoutMs ?? API_READ_TIMEOUT_MS,
  }
  const { status, payload, headers } = await performRequest(path, options, timeouts)
  if (!status || status < 200 || status >= 300) {
    throw new ApiError(errorMessage(payload, status), status, payload, parseRetryAfterSeconds(headers))
  }
  return payload as T
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const maxRetries = options.retries ?? API_MAX_RETRIES
  const retryOn429 = options.retryOn429 !== false
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await executeRequest<T>(path, options)
    } catch (error) {
      lastError = error
      const canRetryNetwork = error instanceof ApiError && isTransientStatus(error.status) && attempt < maxRetries
      const canRetryRateLimit = error instanceof ApiError && error.status === 429 && retryOn429 && attempt < maxRetries
      if (!canRetryNetwork && !canRetryRateLimit) throw error
      const rateLimitDelay = error instanceof ApiError && error.retryAfterSeconds !== null
        ? error.retryAfterSeconds * 1_000
        : RETRY_BASE_DELAY_MS * (2 ** attempt)
      const delay = canRetryRateLimit ? rateLimitDelay : RETRY_BASE_DELAY_MS * (2 ** attempt)
      await sleep(Math.min(Math.max(delay, RETRY_BASE_DELAY_MS), RETRY_MAX_DELAY_MS))
    }
  }

  throw lastError
}

interface ApiFormRequestOptions {
  token?: string
  scopeVersion?: string
  connectTimeoutMs?: number
  readTimeoutMs?: number
}

async function executeFormRequest<T>(
  path: string,
  formData: FormData,
  options: ApiFormRequestOptions,
): Promise<T> {
  const headers = new Headers()
  headers.set('Accept', 'application/json')
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)
  if (options.scopeVersion) headers.set('X-Mobile-Scope-Version', options.scopeVersion)

  const url = `${apiBaseUrl()}${path}`
  const timeoutMs = (options.connectTimeoutMs ?? API_CONNECT_TIMEOUT_MS)
    + (options.readTimeoutMs ?? API_READ_TIMEOUT_MS)
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    })
    window.clearTimeout(timeoutId)

    const contentType = response.headers.get('content-type') ?? ''
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '')

    if (!response.ok) {
      throw new ApiError(errorMessage(payload, response.status), response.status, payload)
    }

    return payload as T
  } catch (error) {
    window.clearTimeout(timeoutId)
    if (error instanceof ApiError) throw error
    throw new ApiError(connectionErrorMessage(error), 0)
  }
}

export async function apiFormRequest<T>(
  path: string,
  formData: FormData,
  options: ApiFormRequestOptions = {},
): Promise<T> {
  return executeFormRequest<T>(path, formData, options)
}
