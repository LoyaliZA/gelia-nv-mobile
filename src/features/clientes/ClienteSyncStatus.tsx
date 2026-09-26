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

interface ClienteSyncStatusProps {
  compact?: boolean
}

export function ClienteSyncStatus({ compact = false }: ClienteSyncStatusProps) {
  const { online, state, syncNow, canSyncClientes } = useClienteSync()
  const refreshTimestamps = useRef<number[]>([])
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const inCooldown = cooldownUntil !== null && now < cooldownUntil

  useEffect(() => {
    if (state.phase !== 'retrying' || state.retryAt === null) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [state.phase, state.retryAt])

  useEffect(() => {
    if (!cooldownUntil) return undefined

    const remaining = Math.max(0, cooldownUntil - Date.now())
    const timer = window.setTimeout(() => {
      setCooldownUntil(null)
      setRateLimitMessage(null)
      refreshTimestamps.current = []
    }, remaining)

    return () => window.clearTimeout(timer)
  }, [cooldownUntil])

  const syncing = state.phase === 'connecting'
    || state.phase === 'bootstrapping'
    || state.phase === 'incremental'
    || state.phase === 'idle'
  const retrySeconds = state.phase === 'retrying' && state.retryAt !== null
    ? Math.max(0, Math.ceil((state.retryAt - now) / 1000))
    : null

  const status = state.phase === 'blocked'
    ? 'Sin permiso'
    : state.phase === 'ready'
      ? 'Listo'
      : state.phase === 'offline'
        ? 'Offline'
        : state.phase === 'retrying'
          ? 'Reintentando'
          : state.phase === 'error'
            ? 'Reintentar'
            : state.phase === 'connecting'
              ? 'Conectando'
              : 'Sincronizando'

  const detail = rateLimitMessage
    ?? (state.phase === 'blocked'
      ? state.error
      : state.phase === 'connecting'
        ? state.error ?? 'Conectando con GELIA…'
        : state.phase === 'bootstrapping'
          ? `${state.downloaded}${state.total !== null ? ` de ${state.total}` : ''} clientes descargados`
          : state.phase === 'incremental'
            ? 'Aplicando cambios recientes…'
            : state.phase === 'retrying'
              ? state.error ?? `Reintentando en ${retrySeconds ?? 0} s…`
              : state.phase === 'ready'
                ? `${state.downloaded} clientes disponibles sin conexión.`
                : state.phase === 'idle'
                  ? 'Preparando sincronización del catálogo…'
                  : state.phase === 'error'
                    ? state.error ?? 'No fue posible sincronizar los clientes.'
                    : state.error ?? 'La sincronización continuará al recuperar conexión.')

  const handleRefresh = () => {
    if (!canSyncClientes) return

    const clickedAt = Date.now()

    if (cooldownUntil !== null && clickedAt < cooldownUntil) {
      setRateLimitMessage(RATE_LIMIT_MESSAGE)
      return
    }

    if (cooldownUntil !== null && clickedAt >= cooldownUntil) {
      setCooldownUntil(null)
      setRateLimitMessage(null)
      refreshTimestamps.current = []
    }

    const recent = pruneTimestamps(refreshTimestamps.current, clickedAt)

    if (recent.length >= REFRESH_LIMIT) {
      setCooldownUntil(clickedAt + COOLDOWN_MS)
      setRateLimitMessage(RATE_LIMIT_MESSAGE)
      return
    }

    setRateLimitMessage(null)
    refreshTimestamps.current = [...recent, clickedAt]
    void syncNow()
  }

  const disabled = !canSyncClientes || syncing || inCooldown || state.phase === 'blocked'

  return (
    <div className={`client-sync-status-wrap${compact ? ' client-sync-status-wrap--compact' : ''}`}>
      <button
        aria-label="Actualizar sincronización de clientes"
        className={`client-sync-status${rateLimitMessage ? ' client-sync-status--limited' : ''}${state.phase === 'blocked' ? ' client-sync-status--blocked' : ''}`}
        disabled={disabled}
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
