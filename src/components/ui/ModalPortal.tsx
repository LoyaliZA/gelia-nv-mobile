import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { PropsWithChildren } from 'react'

interface ModalPortalProps extends PropsWithChildren {
  lockScroll?: boolean
}

export function ModalPortal({ children, lockScroll = true }: ModalPortalProps) {
  useEffect(() => {
    if (!lockScroll) return undefined

    const { style } = document.documentElement
    const prevOverflow = style.overflow
    style.overflow = 'hidden'

    return () => {
      style.overflow = prevOverflow
    }
  }, [lockScroll])

  return createPortal(children, document.body)
}
