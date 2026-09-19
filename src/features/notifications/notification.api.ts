import { apiRequest } from '../../lib/api/apiClient'
import type { MobileSession } from '../auth/auth.types'
import type { NotificationListResponse, NotificationReadResponse } from './notification.types'

export function fetchNotifications(session: MobileSession) {
  return apiRequest<NotificationListResponse>('/mobile/notifications?limit=50', {
    token: session.accessToken,
  })
}

export function markNotificationAsRead(session: MobileSession, id: string) {
  return apiRequest<NotificationReadResponse>(`/mobile/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    token: session.accessToken,
  })
}

export function markAllNotificationsAsRead(session: MobileSession) {
  return apiRequest<{ message: string; unread_count: number }>('/mobile/notifications/read-all', {
    method: 'PATCH',
    token: session.accessToken,
  })
}
