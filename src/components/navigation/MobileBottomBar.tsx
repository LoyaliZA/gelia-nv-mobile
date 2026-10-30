import { ArrowLeft, Menu, Moon, Sun, X } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { GeliaUser } from '../../features/auth/auth.types'
import { ProfileAvatar } from '../profile/ProfileAvatar'
import { GeliaLogo } from '../ui/GeliaLogo'

interface MobileBottomBarProps {
  accessOpen: boolean
  isDarkMode: boolean
  kioskActive: boolean
  onBack: () => void
  onOpenKiosk: () => void
  onToggleAccess: () => void
  onToggleProfile: () => void
  onToggleTheme: () => void
  user: GeliaUser
}

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const EASE_OUT_BACK = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

function motionReducida() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function MobileBottomBar({
  accessOpen,
  isDarkMode,
  kioskActive,
  onBack,
  onOpenKiosk,
  onToggleAccess,
  onToggleProfile,
  onToggleTheme,
  user,
}: MobileBottomBarProps) {
  const [kioskMounted, setKioskMounted] = useState(kioskActive)
  const kioskRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    if (kioskActive) setKioskMounted(true)
  }, [kioskActive])

  useLayoutEffect(() => {
    const marca = kioskRef.current
    if (!marca) return

    const reduce = motionReducida()
    const animation = marca.animate(
      kioskActive
        ? [
            reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.9)' },
            reduce ? { opacity: 1 } : { opacity: 1, transform: 'scale(1)' },
          ]
        : [
            reduce ? { opacity: 1 } : { opacity: 1, transform: 'scale(1)' },
            reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.9)' },
          ],
      {
        duration: reduce ? 160 : kioskActive ? 250 : 220,
        easing: !reduce && kioskActive ? EASE_OUT_BACK : EASE_OUT,
        fill: 'both',
      },
    )

    if (!kioskActive) animation.onfinish = () => setKioskMounted(false)

    return () => {
      if (animation.playState !== 'finished') animation.cancel()
    }
  }, [kioskActive, kioskMounted])

  return (
    <nav aria-label="Barra de navegación móvil" className="mobile-bottom-bar">
      <div className="mobile-bottom-bar__widget">
        <div className="mobile-bottom-bar__left">
          <button
            aria-expanded={accessOpen}
            aria-label={accessOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="mobile-bottom-bar__icon-btn"
            onClick={onToggleAccess}
            type="button"
          >
            {accessOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button aria-label="Atrás" className="mobile-bottom-bar__icon-btn" onClick={onBack} type="button">
            <ArrowLeft size={20} />
          </button>
        </div>

        <button
          aria-label={accessOpen ? 'Cerrar menú' : 'Abrir menú de accesos'}
          className="mobile-bottom-bar__logo-btn"
          onClick={onToggleAccess}
          type="button"
        >
          <GeliaLogo className="gelia-logo--brand" variant="sparkle" />
        </button>

        <div className="mobile-bottom-bar__right">
          <button
            aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="mobile-bottom-bar__icon-btn"
            onClick={onToggleTheme}
            type="button"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {kioskMounted && (
            <button
              aria-label="Modo kiosco activo. No controla el equipo. Abrir Perfil para desactivarlo."
              className="kiosk-mark"
              onClick={onOpenKiosk}
              ref={kioskRef}
              type="button"
            >
              <span aria-hidden="true">K</span>
              <span aria-hidden="true" className="kiosk-mark__dot" />
            </button>
          )}
          <button
            aria-label="Menú de perfil"
            className="mobile-bottom-bar__avatar-btn"
            onClick={onToggleProfile}
            type="button"
          >
            <ProfileAvatar className="mobile-bottom-bar__avatar" size="sm" user={user} />
          </button>
        </div>
      </div>
    </nav>
  )
}
