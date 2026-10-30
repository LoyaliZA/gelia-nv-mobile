import { useRef } from 'react'
import type { AppRoute } from '../../app/routes'
import { useModosDispositivo } from '../../features/dispositivo/useModosDispositivo'
import { SidebarNavMenu } from './SidebarNavMenu'
import { SimpleDestinations } from './SimpleDestinations'

interface MobileAccessSheetProps {
  activeRoute: AppRoute
  onClose: () => void
  onNavigate: (route: AppRoute) => void
  open: boolean
  permissions?: string[]
}

export function MobileAccessSheet({ activeRoute, onClose, onNavigate, open, permissions = [] }: MobileAccessSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { modoSimple } = useModosDispositivo()

  const handleNavigate = (route: AppRoute) => {
    onNavigate(route)
    onClose()
  }

  return (
    <aside
      aria-hidden={!open}
      className={`mobile-bottom-sheet mobile-bottom-sheet--access${open ? ' mobile-bottom-sheet--open' : ''}`}
    >
      <div className="mobile-bottom-sheet__scroll" ref={scrollRef}>
        {modoSimple ? (
          <div className="page-stack">
            <span className="sidebar-nav-header">ACCESOS_</span>
            <SimpleDestinations activeRoute={activeRoute} onNavigate={handleNavigate} permissions={permissions} />
          </div>
        ) : (
          <SidebarNavMenu
            activeRoute={activeRoute}
            onNavigate={handleNavigate}
            permissions={permissions}
            scrollContainerRef={scrollRef}
            sheetOpen={open}
          />
        )}
      </div>
    </aside>
  )
}
