import { ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import type { AppRoute } from '../../app/routes'
import { buildMobileNavigation } from '../../config/mobileNavigation'
import { routeToNavUrl } from '../../config/mobileRoutes'
import type { SidebarGroupNode, SidebarLinkNode } from '../../config/navTypes'
import { findActiveRootGroupId } from '../../config/sidebarNavigation'

interface SidebarNavMenuProps {
  activeRoute: AppRoute
  onNavigate: (route: AppRoute) => void
  scrollContainerRef?: RefObject<HTMLElement | null>
  sheetOpen?: boolean
}

function scrollGroupIntoView(scrollEl: HTMLElement, groupEl: HTMLElement) {
  const scrollRect = scrollEl.getBoundingClientRect()
  const groupRect = groupEl.getBoundingClientRect()
  const padding = 14

  const overflowBottom = groupRect.bottom - scrollRect.bottom + padding
  const overflowTop = scrollRect.top - groupRect.top + padding

  if (overflowBottom > 0) {
    scrollEl.scrollBy({ top: overflowBottom, behavior: 'smooth' })
  } else if (overflowTop > 0) {
    scrollEl.scrollBy({ top: -overflowTop, behavior: 'smooth' })
  }
}

function SidebarNavLink({
  active,
  index,
  isOpen,
  item,
  onNavigate,
}: {
  active: boolean
  index: number
  isOpen: boolean
  item: SidebarLinkNode
  onNavigate: (route: AppRoute) => void
}) {
  const Icon = item.icon

  return (
    <button
      aria-current={active ? 'page' : undefined}
      className={`sidebar-nav-link${active ? ' sidebar-nav-link--active' : ''}${isOpen ? ' sidebar-nav-link--visible' : ''}`}
      onClick={() => {
        if (item.mobileRoute) onNavigate(item.mobileRoute)
      }}
      style={{ '--sidebar-link-delay': `${index * 45}ms` } as CSSProperties}
      type="button"
    >
      <Icon size={17} />
      <span className="sidebar-nav-link__label">{item.label}</span>
      <ChevronRight size={14} />
    </button>
  )
}

function SidebarNavGroup({
  activeRoute,
  group,
  groupRef,
  isOpen,
  onNavigate,
  style,
  toggleGroup,
}: {
  activeRoute: AppRoute
  group: SidebarGroupNode
  groupRef: (el: HTMLDivElement | null) => void
  isOpen: boolean
  onNavigate: (route: AppRoute) => void
  style?: CSSProperties
  toggleGroup: (id: string) => void
}) {
  const Icon = group.icon
  const visibleLinks = group.children.filter(
    (child) => child.type === 'link' && child.mobileRoute,
  ) as SidebarLinkNode[]

  return (
    <div className="sidebar-nav-group sidebar-nav-group--root" ref={groupRef} style={style}>
      <button
        aria-expanded={isOpen}
        className={`sidebar-nav-group__trigger${isOpen ? ' sidebar-nav-group__trigger--open' : ''}`}
        onClick={() => toggleGroup(group.id)}
        type="button"
      >
        <Icon size={17} />
        <span>{group.label}</span>
        <ChevronRight className="sidebar-nav-group__chevron" size={16} />
      </button>
      <div
        aria-hidden={!isOpen}
        className={`sidebar-nav-group__children${isOpen ? ' sidebar-nav-group__children--open' : ''}`}
      >
        <div className="sidebar-nav-group__children-inner">
          {visibleLinks.map((child, index) => (
            <SidebarNavLink
              active={child.mobileRoute === activeRoute}
              index={index}
              isOpen={isOpen}
              item={child}
              key={child.id}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SidebarNavMenu({
  activeRoute,
  onNavigate,
  scrollContainerRef,
  sheetOpen = false,
}: SidebarNavMenuProps) {
  const navUrl = routeToNavUrl(activeRoute)
  const tree = useMemo(() => buildMobileNavigation(), [])
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [openGroupId, setOpenGroupId] = useState<string | null>(() =>
    findActiveRootGroupId(tree, navUrl),
  )

  useEffect(() => {
    const activeId = findActiveRootGroupId(tree, navUrl)
    if (activeId) setOpenGroupId(activeId)
  }, [navUrl, tree])

  const scrollToGroup = useCallback(
    (groupId: string, delayMs = 220) => {
      const scrollEl = scrollContainerRef?.current
      const groupEl = groupRefs.current[groupId]
      if (!scrollEl || !groupEl) return

      window.setTimeout(() => {
        scrollGroupIntoView(scrollEl, groupEl)
      }, delayMs)
    },
    [scrollContainerRef],
  )

  useEffect(() => {
    if (!sheetOpen || !openGroupId) return
    scrollToGroup(openGroupId, 280)
  }, [sheetOpen, openGroupId, scrollToGroup])

  const toggleGroup = useCallback(
    (id: string) => {
      setOpenGroupId((prev) => {
        const next = prev === id ? null : id
        if (next) scrollToGroup(next)
        return next
      })
    },
    [scrollToGroup],
  )

  const setGroupRef = useCallback((id: string) => {
    return (el: HTMLDivElement | null) => {
      groupRefs.current[id] = el
    }
  }, [])

  return (
    <nav aria-label="Menú de accesos" className="sidebar-nav-menu">
      {tree.map((node, index) => {
        if (node.type !== 'group') return null
        return (
          <SidebarNavGroup
            activeRoute={activeRoute}
            group={node}
            groupRef={setGroupRef(node.id)}
            isOpen={openGroupId === node.id}
            key={node.id}
            onNavigate={onNavigate}
            toggleGroup={toggleGroup}
            style={{ '--sidebar-group-delay': `${index * 60}ms` } as CSSProperties}
          />
        )
      })}
    </nav>
  )
}
