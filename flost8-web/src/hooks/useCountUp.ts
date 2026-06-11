import { useEffect, useRef, useState } from 'react'
import { animate, utils } from 'animejs'

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
    const obj = { v: 0 }
    const anim = animate(obj, {
      v: target,
      duration: 1600,
      ease: 'outExpo',
      onUpdate: () => setN(utils.round(obj.v, 0)),
    })
    return () => {
      anim.revert()
    }
  }, [active, target, reduce])
  return n
}
