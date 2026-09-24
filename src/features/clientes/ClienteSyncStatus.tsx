import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useClienteSync } from './useClienteSync'

const REFRESH_LIMIT = 2
const REFRESH_WINDOW_MS = 60_000
const COOLDOWN_MS = 5 * 60_000
const RATE_LIMIT_MESSAGE = 'Has excedido el uso de las actualizaciones. Intenta más tarde.'

function pruneTimestamps(timestamps: number[], now = Date.now()) {
  return timestamps.filter((timestamp) => now - timestamp < REFRESH_WINDOW_MS)
}

export function ClienteSyncStatus() {
  const { online, state, syncNow } = useClienteSync()
  const refreshTimestamps = useRef<number[]>([])
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null)
  const inCooldown = cooldownUntil !== null && Date.now() < cooldownUntil

  useEffect(() => {
    if (!cooldownUntil) return undefined

    const remaining = cooldownUntil - Date.now()
    if (remaining <= 0) {
      setCooldownUntil(null)
      setRateLimitMessage(null)
      refreshTimestamps.current = []
      return undefined
    }

    const timer = window.setTimeout(() => {
      setCooldownUntil(null)
      setRateLimitMessage(null)
      refreshTimestamps.current = []
    }, remaining)

    return () => window.clearTimeout(timer)
  }, [cooldownUntil])

  const syncing = state.phase === 'bootstrapping' || state.phase === 'incremental'
  const status = state.phase === 'ready'
    ? 'Listo'
    : state.phase === 'offline'
      ? 'Offline'
      : state.phase === 'error'
        ? 'Reintentar'
        : 'Sincronizando'

  const detail = rateLimitMessage
    ?? (state.phase === 'bootstrapping'
      ? `${state.downloaded}${state.total !== null ? ` de ${state.total}` : ''} clientes descargados`
      : state.phase === 'incremental'
        ? 'Aplicando cambios recientes…'
        : state.phase === 'ready'
          ? `${state.downloaded} clientes disponibles sin conexión.`
          : state.error || 'La sincronización continuará al recuperar conexión.')

  const handleRefresh = () => {
    const now = Date.now()

    if (cooldownUntil !== null && now < cooldownUntil) {
      setRateLimitMessage(RATE_LIMIT_MESSAGE)
      return
    }

    if (cooldownUntil !== null && now >= cooldownUntil) {
      setCooldownUntil(null)
      setRateLimitMessage(null)
      refreshTimestamps.current = []
    }

    const recent = pruneTimestamps(refreshTimestamps.current, now)

    if (recent.length >= REFRESH_LIMIT) {
      setCooldownUntil(now + COOLDOWN_MS)
      setRateLimitMessage(RATE_LIMIT_MESSAGE)
      return
    }

    setRateLimitMessage(null)
    refreshTimestamps.current = [...recent, now]
    void syncNow()
  }

  return (
    <div className="client-sync-status-wrap">
      <button
        aria-label="Actualizar sincronización de clientes"
        className={`client-sync-status${rateLimitMessage ? ' client-sync-status--limited' : ''}`}
        disabled={syncing || inCooldown}
        onClick={handleRefresh}
        type="button"
      >
        <span className={syncing ? 'client-sync-status__icon--active' : 'client-sync-status__icon'}>
          <RefreshCw size={14} />
        </span>
        <span className="client-sync-status__copy">
          <strong>Sincronización de clientes</strong>
          <small>{detail}</small>
        </span>
        <span className="client-sync-status__meta">
          <span className={`client-sync-status__online${online ? '' : ' client-sync-status__online--offline'}`}>
            {online ? 'En línea' : 'Sin conexión'}
          </span>
          <b className={`client-sync-status__badge client-sync-status__badge--${state.phase}`}>{status}</b>
        </span>
      </button>
    </div>
  )
}
