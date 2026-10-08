import { useEffect, useRef, useState } from 'react'

/** Counts 0 -> `target` once `active` flips true. Reduced-motion (or target 0) shows target instantly. */
export function useCountUp(target: number, active: boolean, reduce: boolean): number {
  const [n, setN] = useState(0)
  const done = useRef(false)
  useEffect(() => {
    if (!active || done.current) return
    done.current = true
    if (reduce || target === 0) {
      queueMicrotask(() => setN(target))
      return
    }
    // ponytail: plain rAF tween replaces animejs. outExpo easing keeps the old feel.
    const duration = 1600
    const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
    let raf = 0
    let start = 0
    const tick = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setN(Math.round(target * easeOutExpo(p)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target, reduce])
  return n
}
