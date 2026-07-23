import { useEffect, useRef } from 'react'
import { useInView } from 'framer-motion'
import { useMotionSafe } from '../../hooks/useMotionSafe'

/** Hairline purple rule that inks itself L->R when scrolled into view. */
export default function EyebrowRule({ width = 56 }: { width?: number }) {
  const { reduce } = useMotionSafe()
  const ref = useRef<SVGSVGElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  useEffect(() => {
    const line = lineRef.current
    if (!line) return
    const len = width
    line.style.strokeDasharray = String(len)
    // ponytail: CSS transition replaces animejs. Global reduced-motion CSS block
    // also neutralises this; the explicit branch below is belt-and-suspenders.
    if (reduce) {
      line.style.transition = 'none'
      line.style.strokeDashoffset = '0'
      return
    }
    line.style.strokeDashoffset = String(len)
    line.style.transition = 'stroke-dashoffset 700ms cubic-bezier(0.45,0,0.55,1)'
    if (inView) {
      const raf = requestAnimationFrame(() => {
        line.style.strokeDashoffset = '0'
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [inView, reduce, width])

  return (
    <svg
      ref={ref}
      width={width}
      height="2"
      viewBox={`0 0 ${width} 2`}
      aria-hidden="true"
      className="mt-2 block"
    >
      <line ref={lineRef} x1="0" y1="1" x2={width} y2="1" stroke="var(--accent, #9D14FF)" strokeWidth="1.5" />
    </svg>
  )
}
