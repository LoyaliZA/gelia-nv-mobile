import type { ReactNode } from 'react'

interface DashboardMobileViewProps {
  sections: Array<{ id: string; content: ReactNode }>
}

export function DashboardMobileView({ sections }: DashboardMobileViewProps) {
  return (
    <div className="dashboard-mobile-view">
      {sections.map((section) => (
        <div className="dashboard-mobile-view__section" key={section.id}>
          {section.content}
        </div>
      ))}
    </div>
  )
}
