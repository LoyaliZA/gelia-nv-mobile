import type { ReactNode, SVGProps } from 'react'

export type IconName = 'home' | 'users' | 'user' | 'menu' | 'search' | 'refresh' | 'logout' | 'close' | 'shield' | 'arrow' | 'wifi' | 'chevron'

const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  refresh: <><path d="M20 6v5h-5M4 18v-5h5"/><path d="M18 9a7 7 0 0 0-12-2L4 11M6 15a7 7 0 0 0 12 2l2-4"/></>,
  logout: <><path d="m10 17 5-5-5-5M15 12H3"/><path d="M15 3h5v18h-5"/></>,
  close: <path d="M6 6l12 12M18 6 6 18"/>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6"/>,
  wifi: <><path d="M5 12.55a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0"/><circle cx="12" cy="20" r="1"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
}

interface IconProps extends SVGProps<SVGSVGElement> { name: IconName }

export function Icon({ name, ...props }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}
