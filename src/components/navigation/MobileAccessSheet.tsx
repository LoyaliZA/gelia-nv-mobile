import { useRef } from 'react'
import type { AppRoute } from '../../app/routes'
import { SidebarNavMenu } from './SidebarNavMenu'

interface MobileAccessSheetProps {
  activeRoute: AppRoute
  onClose: () => void
  onNavigate: (route: AppRoute) => void
  open: boolean
}

export function MobileAccessSheet({ activeRoute, onClose, onNavigate, open }: MobileAccessSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

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
        <SidebarNavMenu
          activeRoute={activeRoute}
          onNavigate={handleNavigate}
          scrollContainerRef={scrollRef}
          sheetOpen={open}
        />
      </div>
    </aside>
  )
}
