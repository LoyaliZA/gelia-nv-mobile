import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../components/ui/Icon'
import type { MobileSession } from '../auth/auth.types'
import { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead } from './notification.api'
import type { MobileNotification } from './notification.types'

interface NotificationCenterProps {
  session: MobileSession
}

const errorTypes = ['rechazada', 'cancelada', 'fallida', 'error', 'vencimiento', 'insuficiente']

function textValue(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function notificationCopy(notification: MobileNotification) {
  const data = notification.data || {}
  const type = textValue(data.tipo, notification.type.split('\\').pop() || 'actualizacion')
  const moduleName = textValue(data.modulo, 'Sistema').replaceAll('_', ' ')

  return {
    isAlert: errorTypes.some((candidate) => type.toLowerCase().includes(candidate)),
    label: moduleName,
    title: textValue(data.titulo ?? data.proceso, 'Actualización de GELIA'),
    message: textValue(data.mensaje_visible ?? data.mensaje, 'Nueva actividad en el sistema.'),
  }
}

function formatDate(value: string | null) {
  if (!value) return 'Ahora'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Ahora'

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function NotificationCenter({ session }: NotificationCenterProps) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<MobileNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await fetchNotifications(session)
      setNotifications(response.data)
      setUnreadCount(response.unread_count)
      setError(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar las notificaciones.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => { void refresh() }, 0)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(initialRefresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const unreadLabel = useMemo(
    () => `${unreadCount} ${unreadCount === 1 ? 'notificación pendiente' : 'notificaciones pendientes'}`,
    [unreadCount],
  )

  const openCenter = () => {
    setOpen(true)
    void refresh()
  }

  const readNotification = async (notification: MobileNotification) => {
    if (notification.read_at) return

    try {
      const response = await markNotificationAsRead(session, notification.id)
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, read_at: response.read_at } : item
      )))
      setUnreadCount(response.unread_count)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible marcar la notificación.')
    }
  }

  const readAll = async () => {
    try {
      await markAllNotificationsAsRead(session)
      const readAt = new Date().toISOString()
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })))
      setUnreadCount(0)
      setError(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible actualizar la bandeja.')
    }
  }

  return (
    <>
      <button aria-label={unreadCount > 0 ? `Abrir notificaciones, ${unreadLabel}` : 'Abrir notificaciones'} className="navbar-icon-button notification-trigger" onClick={openCenter} type="button">
        <Icon name="bell" />
        {unreadCount > 0 && <span className="notification-badge" aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && createPortal(
        <div className="notification-layer">
          <button aria-label="Cerrar notificaciones" className="notification-backdrop" onClick={() => setOpen(false)} type="button" />
          <section aria-labelledby="notification-title" aria-modal="true" className="notification-panel" role="dialog">
            <header className="notification-header">
              <div className="notification-heading-icon"><Icon name="bell" /></div>
              <div>
                <h2 id="notification-title">Centro de alertas_</h2>
                <p>{unreadLabel}</p>
              </div>
              <button aria-label="Cerrar notificaciones" className="notification-close" onClick={() => setOpen(false)} type="button"><Icon name="close" /></button>
            </header>

            <div className="notification-list">
              {error && <button className="notification-error" onClick={() => void refresh()} type="button">{error} Toca para reintentar.</button>}
              {loading && notifications.length === 0 && <div className="notification-empty"><span className="spin"><Icon name="refresh" /></span><p>Cargando alertas…</p></div>}
              {!loading && notifications.length === 0 && !error && <div className="notification-empty"><Icon name="bell" /><strong>Bandeja limpia_</strong><p>Sin novedades operativas.</p></div>}
              {notifications.map((notification) => {
                const copy = notificationCopy(notification)
                return (
                  <button className={`notification-card${notification.read_at ? ' notification-card--read' : ''}`} key={notification.id} onClick={() => void readNotification(notification)} type="button">
                    <span className={`notification-status-icon${copy.isAlert ? ' notification-status-icon--alert' : ''}`}><Icon name={copy.isAlert ? 'alert-circle' : 'check-circle'} /></span>
                    <span className="notification-copy">
                      <span className="notification-meta"><b>{copy.label}</b><time>{formatDate(notification.created_at)}</time></span>
                      <strong>{copy.title}</strong>
                      <span>{copy.message}</span>
                    </span>
                    {!notification.read_at && <i aria-label="Sin leer" />}
                  </button>
                )
              })}
            </div>

            {notifications.length > 0 && (
              <footer className="notification-footer">
                <button disabled={unreadCount === 0} onClick={() => void readAll()} type="button"><Icon name="check-circle" /> Marcar todas como leídas</button>
              </footer>
            )}
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}
