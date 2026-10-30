import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useClienteSync } from './useClienteSync'
import type { ClienteSyncState } from './cliente.types'

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

function textoEsencial(state: ClienteSyncState) {
  const sincronizando = state.phase === 'bootstrapping' || state.phase === 'incremental' || state.phase === 'connecting'
  if (state.requiereResincronizacion && !sincronizando) {
    return { texto: 'Revisar', tono: 'alerta' as const }
  }

  switch (state.phase) {
    case 'ready':
      return { texto: 'Listo', tono: 'ok' as const }
    case 'bootstrapping':
      return {
        texto: state.total !== null ? `${state.downloaded} de ${state.total}` : String(state.downloaded),
        tono: 'progreso' as const,
      }
    case 'incremental':
      return { texto: 'Actualizando', tono: 'progreso' as const }
    case 'connecting':
      return { texto: 'Conectando', tono: 'progreso' as const }
    case 'idle':
      return { texto: state.downloaded > 0 ? 'En espera' : 'Sin base', tono: 'progreso' as const }
    case 'retrying':
      return { texto: 'Reintentando', tono: 'alerta' as const }
    case 'offline':
      return { texto: 'Sin conexión', tono: 'alerta' as const }
    case 'error':
      return { texto: 'Error', tono: 'error' as const }
    case 'blocked':
      return { texto: 'Sin permiso', tono: 'error' as const }
  }
}

export function ClienteSyncStatus({ compact = false }: ClienteSyncStatusProps) {
  const { online, state, syncNow, canSyncClientes, resincronizarCatalogo, eliminarBaseLocal } = useClienteSync()
  const refreshTimestamps = useRef<number[]>([])
  const [expanded, setExpanded] = useState(false)
  const [confirmacion, setConfirmacion] = useState<'resincronizar' | 'eliminar' | null>(null)
  const [accionando, setAccionando] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const inCooldown = cooldownUntil !== null && now < cooldownUntil
  const panelRef = useRef<HTMLDivElement>(null)
  const esencial = textoEsencial(state)
  const avance = state.phase === 'bootstrapping' && state.total
    ? Math.min(100, Math.round((state.downloaded / Math.max(state.total, 1)) * 100))
    : null

  useEffect(() => {
    if (state.phase !== 'retrying' || state.retryAt === null) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [state.phase, state.retryAt])

  useEffect(() => {
    if (!expanded) return undefined
    const cerrarSiSale = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setExpanded(false)
        setConfirmacion(null)
      }
    }
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setExpanded(false)
      setConfirmacion(null)
    }
    document.addEventListener('pointerdown', cerrarSiSale)
    document.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.removeEventListener('pointerdown', cerrarSiSale)
      document.removeEventListener('keydown', cerrarConEscape)
    }
  }, [expanded])

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
  const retrySeconds = state.phase === 'retrying' && state.retryAt !== null
    ? Math.max(0, Math.ceil((state.retryAt - now) / 1000))
    : null

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
                ? state.error ?? `${state.downloaded} clientes disponibles sin conexión.`
                : state.phase === 'idle'
                  ? 'La base local está vacía. Sincroniza cuando quieras descargarla.'
                  : state.phase === 'error'
                    ? state.error ?? 'No fue posible sincronizar los clientes.'
                    : state.error ?? 'La sincronización continuará al recuperar conexión.')

  const handleRefresh = () => {
    if (!canSyncClientes || accionando) return

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

  const ejecutarConfirmacion = async () => {
    if (!confirmacion || accionando) return
    setAccionando(true)
    try {
      if (confirmacion === 'resincronizar') await resincronizarCatalogo()
      else await eliminarBaseLocal()
      setConfirmacion(null)
    } finally {
      setAccionando(false)
    }
  }

  const disabled = !canSyncClientes || syncing || inCooldown || state.phase === 'blocked' || accionando

  return (
    <div className={`client-sync-panel${compact ? ' client-sync-panel--compact' : ''}`} ref={panelRef}>
      <button
        aria-expanded={expanded}
        aria-label={`Sincronización de clientes: ${esencial.texto}`}
        className={`client-sync-summary client-sync-summary--${esencial.tono}`}
        onClick={() => {
          setExpanded((current) => !current)
          setConfirmacion(null)
        }}
        type="button"
      >
        <span aria-hidden="true" className="client-sync-summary__dot" />
        <span className="client-sync-summary__text">{esencial.texto}</span>
        {avance !== null && (
          <span aria-hidden="true" className="client-sync-summary__meter">
            <span style={{ width: `${avance}%` }} />
          </span>
        )}
      </button>

      {expanded && (
        <div className="client-sync-detail">
          <p>{detail}</p>
          <p className={online ? 'client-sync-detail__online' : 'client-sync-detail__online client-sync-detail__online--offline'}>
            {online ? 'En línea' : 'Sin conexión'}
            {state.downloaded > 0 ? ` · ${state.downloaded} guardados` : ''}
          </p>
          <button className="secondary-button client-sync-action" disabled={disabled} onClick={handleRefresh} type="button">
            <RefreshCw size={16} />
            Actualizar
          </button>
          {confirmacion === null ? (
            <div className="client-sync-actions">
              <button
                className="secondary-button client-sync-action"
                disabled={!canSyncClientes || syncing || accionando}
                onClick={() => setConfirmacion('resincronizar')}
                type="button"
              >
                Resincronizar
              </button>
              <button
                className="logout-button client-sync-action"
                disabled={!canSyncClientes || syncing || accionando}
                onClick={() => setConfirmacion('eliminar')}
                type="button"
              >
                Eliminar base local
              </button>
            </div>
          ) : (
            <div className="client-sync-confirm" role="group" aria-label="Confirmar acción sobre la base local">
              <p>
                {confirmacion === 'resincronizar'
                  ? 'Se borrará la base de este dispositivo y se descargará de nuevo.'
                  : 'Se borrará la base de este dispositivo. No se descargará hasta que pidas sincronizar.'}
              </p>
              <button className="primary-button client-sync-action" disabled={accionando} onClick={() => void ejecutarConfirmacion()} type="button">
                {accionando ? 'Procesando…' : 'Confirmar'}
              </button>
              <button className="secondary-button client-sync-action" disabled={accionando} onClick={() => setConfirmacion(null)} type="button">
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
