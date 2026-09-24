import type { LucideIcon } from 'lucide-react'
import type { AppRoute } from '../app/routes'

export interface SidebarHeaderNode {
  type: 'header'
  id: string
  label: string
}

export interface SidebarLinkNode {
  type: 'link'
  id: string
  label: string
  icon: LucideIcon
  href: () => string
  active: (url: string) => boolean
  description?: string
  badge?: number
  mobileEnabled: boolean
  mobileRoute: AppRoute | null
}

export interface SidebarGroupNode {
  type: 'group'
  id: string
  label: string
  icon: LucideIcon
  defaultOpen?: boolean
  children: SidebarNode[]
}

export type SidebarNode = SidebarHeaderNode | SidebarLinkNode | SidebarGroupNode
