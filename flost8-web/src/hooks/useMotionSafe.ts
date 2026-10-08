import { useCallback, useEffect, useState } from 'react'
import type { Variants } from 'framer-motion'

export interface MotionSafe {
  reduce: boolean
  guard: (run: () => (() => void) | void) => () => void
  variant: (motion: Variants, staticV?: Variants) => Variants
}

const DEFAULT_STATIC_VARIANTS: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
}

function readMatchMedia(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function initialRead(source?: boolean | null): boolean {
  if (source !== undefined) {
    return source === null ? true : source
  }
  return readMatchMedia()
}

export function useMotionSafe(source?: boolean | null): MotionSafe {
  const [mediaReduce, setMediaReduce] = useState(() => readMatchMedia())

  useEffect(() => {
    if (source !== undefined) {
      return
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (e: MediaQueryListEvent) => setMediaReduce(e.matches)

    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [source])

  const reduce = source !== undefined ? initialRead(source) : mediaReduce

  const guard = useCallback(
    (run: () => (() => void) | void) => {
      if (reduce) {
        return () => {}
      }
      const cleanup = run()
      return cleanup ?? (() => {})
    },
    [reduce],
  )

  const variant = useCallback(
    (motion: Variants, staticV?: Variants) => {
      if (!reduce) {
        return motion
      }
      return staticV ?? DEFAULT_STATIC_VARIANTS
    },
    [reduce],
  )

  return { reduce, guard, variant }
}
