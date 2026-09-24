import type { LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'

interface DashboardModuleCardProps {
  borderClass?: string
  borderStyle?: CSSProperties
  disabled?: boolean
  icon: LucideIcon
  iconClass?: string
  iconStyle?: CSSProperties
  iconWrapClass?: string
  iconWrapStyle?: CSSProperties
  onClick?: () => void
  subtitle: string
  title: string
}

export function DashboardModuleCard({
  borderClass = '',
  borderStyle,
  disabled = false,
  icon: Icon,
  iconClass = '',
  iconStyle,
  iconWrapClass = '',
  iconWrapStyle,
  onClick,
  subtitle,
  title,
}: DashboardModuleCardProps) {
  return (
    <button
      aria-disabled={disabled}
      className={`dashboard-module-card-mobile${disabled ? ' dashboard-module-card-mobile--disabled' : ''} ${borderClass}`.trim()}
      disabled={disabled}
      onClick={onClick}
      style={borderStyle}
      title={subtitle}
      type="button"
    >
      <div className={`dashboard-module-card-mobile__icon-wrap ${iconWrapClass}`.trim()} style={iconWrapStyle}>
        <Icon className={iconClass} size={18} style={iconStyle} />
      </div>
      <span className="dashboard-module-card-mobile__title">{title}</span>
      {disabled ? <span className="dashboard-module-card-mobile__badge">Próximamente</span> : null}
    </button>
  )
}
