import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

type PortalSurfaceProps = {
  children: ReactNode
}

export function PortalSurface({ children }: PortalSurfaceProps) {
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(children, document.body)
}
