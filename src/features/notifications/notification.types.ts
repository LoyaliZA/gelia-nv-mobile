export interface MobileNotification {
  id: string
  type: string
  data: Record<string, unknown>
  read_at: string | null
  created_at: string | null
}

export interface NotificationListResponse {
  data: MobileNotification[]
  unread_count: number
}

export interface NotificationReadResponse {
  id: string
  read_at: string | null
  unread_count: number
}
