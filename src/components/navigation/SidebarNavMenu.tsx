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
  permissions?: string[]
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

function groupContainsRoute(group: SidebarGroupNode, activeRoute: AppRoute): boolean {
  return group.children.some((child) => {
    if (child.type === 'link') return child.mobileRoute === activeRoute
    if (child.type === 'group') return groupContainsRoute(child, activeRoute)
    return false
  })
}

function collectActiveNestedGroupIds(groups: SidebarGroupNode[], activeRoute: AppRoute): string[] {
  const ids: string[] = []

  const walk = (nodes: SidebarGroupNode['children']) => {
    for (const child of nodes) {
      if (child.type !== 'group') continue
      if (groupContainsRoute(child, activeRoute)) ids.push(child.id)
      walk(child.children)
    }
  }

  for (const group of groups) walk(group.children)
  return ids
}

function SidebarNavGroup({
  activeRoute,
  depth,
  group,
  groupRef,
  isOpen,
  nestedOpenIds,
  onNavigate,
  style,
  toggleGroup,
  toggleNested,
}: {
  activeRoute: AppRoute
  depth: number
  group: SidebarGroupNode
  groupRef?: (el: HTMLDivElement | null) => void
  isOpen: boolean
  nestedOpenIds: ReadonlySet<string>
  onNavigate: (route: AppRoute) => void
  style?: CSSProperties
  toggleGroup: (id: string) => void
  toggleNested: (id: string) => void
}) {
  const Icon = group.icon
  const isRoot = depth === 0

  return (
    <div
      className={`sidebar-nav-group${isRoot ? ' sidebar-nav-group--root' : ' sidebar-nav-group--nested'}`}
      ref={groupRef}
      style={style}
    >
      <button
        aria-expanded={isOpen}
        className={`sidebar-nav-group__trigger${isRoot ? '' : ' sidebar-nav-group__trigger--nested'}${isOpen ? ' sidebar-nav-group__trigger--open' : ''}`}
        onClick={() => (isRoot ? toggleGroup(group.id) : toggleNested(group.id))}
        type="button"
      >
        <Icon size={isRoot ? 17 : 16} />
        <span>{group.label}</span>
        <ChevronRight className="sidebar-nav-group__chevron" size={16} />
      </button>
      <div
        aria-hidden={!isOpen}
        className={`sidebar-nav-group__children${isOpen ? ' sidebar-nav-group__children--open' : ''}`}
      >
        <div className="sidebar-nav-group__children-inner">
          {group.children.map((child, index) => {
            if (child.type === 'link' && child.mobileRoute) {
              return (
                <SidebarNavLink
                  active={child.mobileRoute === activeRoute}
                  index={index}
                  isOpen={isOpen}
                  item={child}
                  key={child.id}
                  onNavigate={onNavigate}
                />
              )
            }

            if (child.type === 'group') {
              return (
                <SidebarNavGroup
                  activeRoute={activeRoute}
                  depth={depth + 1}
                  group={child}
                  isOpen={nestedOpenIds.has(child.id)}
                  key={child.id}
                  nestedOpenIds={nestedOpenIds}
                  onNavigate={onNavigate}
                  toggleGroup={toggleGroup}
                  toggleNested={toggleNested}
                />
              )
            }

            return null
          })}
        </div>
      </div>
    </div>
  )
}

export function SidebarNavMenu({
  activeRoute,
  onNavigate,
  permissions = [],
  scrollContainerRef,
  sheetOpen = false,
}: SidebarNavMenuProps) {
  const navUrl = routeToNavUrl(activeRoute)
  const tree = useMemo(() => buildMobileNavigation(permissions), [permissions])
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const rootGroups = useMemo(
    () => tree.filter((node): node is SidebarGroupNode => node.type === 'group'),
    [tree],
  )

  const [openGroupId, setOpenGroupId] = useState<string | null>(() =>
    findActiveRootGroupId(tree, navUrl),
  )
  const [nestedOpenIds, setNestedOpenIds] = useState<ReadonlySet<string>>(() =>
    new Set(collectActiveNestedGroupIds(rootGroups, activeRoute)),
  )

  useEffect(() => {
    const activeId = findActiveRootGroupId(tree, navUrl)
    if (activeId) setOpenGroupId(activeId)
  }, [navUrl, tree])

  useEffect(() => {
    const activeNested = collectActiveNestedGroupIds(rootGroups, activeRoute)
    if (activeNested.length === 0) return
    setNestedOpenIds((current) => {
      if (activeNested.every((id) => current.has(id))) return current
      const next = new Set(current)
      for (const id of activeNested) next.add(id)
      return next
    })
  }, [activeRoute, rootGroups])

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

  const toggleNested = useCallback((id: string) => {
    setNestedOpenIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return (
    <nav aria-label="Menú de accesos" className="sidebar-nav-menu">
      {rootGroups.map((node, index) => (
        <SidebarNavGroup
          activeRoute={activeRoute}
          depth={0}
          group={node}
          groupRef={setGroupRef(node.id)}
          isOpen={openGroupId === node.id}
          key={node.id}
          nestedOpenIds={nestedOpenIds}
          onNavigate={onNavigate}
          toggleGroup={toggleGroup}
          toggleNested={toggleNested}
          style={{ '--sidebar-group-delay': `${index * 60}ms` } as CSSProperties}
        />
      ))}
    </nav>
  )
}
