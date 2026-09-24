import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

interface DashboardPanelProps {
  children: ReactNode
  icon?: LucideIcon
  iconClassName?: string
  iconStyle?: CSSProperties
  title: string
}

export function DashboardPanel({ children, icon: Icon, iconClassName = '', iconStyle, title }: DashboardPanelProps) {
  return (
    <section className="dashboard-panel-mobile">
      <header className="dashboard-panel-mobile__header">
        {Icon && <Icon className={iconClassName} size={20} style={iconStyle} />}
        <h2 className="dashboard-panel-mobile__title">{title}</h2>
      </header>
      <div className="dashboard-panel-mobile__body">{children}</div>
    </section>
  )
}
