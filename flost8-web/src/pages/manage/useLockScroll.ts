import { useEffect } from 'react'
import { useLenis } from 'lenis/react'

/** Freezes the page behind a drawer or dialog (the site uses Lenis smooth scrolling). */
export function useLockScroll(active: boolean) {
  const lenis = useLenis()
  useEffect(() => {
    if (!active) return
    lenis?.stop()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      lenis?.start()
      document.body.style.overflow = prev
    }
  }, [active, lenis])
}
