import type { ReactNode, SVGProps } from 'react'

export type IconName = 'home' | 'users' | 'user' | 'menu' | 'search' | 'refresh' | 'logout' | 'close' | 'shield' | 'arrow' | 'arrow-left' | 'wifi' | 'chevron' | 'fingerprint' | 'bell' | 'sun' | 'moon' | 'check-circle' | 'alert-circle'

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
  'arrow-left': <path d="M19 12H5m6 6-6-6 6-6"/>,
  wifi: <><path d="M5 12.55a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0"/><circle cx="12" cy="20" r="1"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  fingerprint: <><path d="M12 11a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1Z"/><path d="M12 3a9 9 0 0 0-9 9c0 1.5.3 2.9.9 4.2"/><path d="M12 3a9 9 0 0 1 9 9c0 1.5-.3 2.9-.9 4.2"/><path d="M8.5 6.2A6 6 0 0 0 6 11v1"/><path d="M15.5 6.2A6 6 0 0 1 18 11v1"/><path d="M9 16.2A4 4 0 0 0 12 17a4 4 0 0 0 3-1.2"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>,
  'check-circle': <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  'alert-circle': <><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></>,
}

interface IconProps extends SVGProps<SVGSVGElement> { name: IconName }

export function Icon({ name, ...props }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}
