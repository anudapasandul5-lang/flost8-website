import { useEffect, useRef } from 'react'
import { useReducedMotion, useInView } from 'framer-motion'
import { animate } from 'animejs'

/** Hairline purple rule that inks itself L->R when scrolled into view. */
export default function EyebrowRule({ width = 56 }: { width?: number }) {
  const shouldReduce = useReducedMotion()
  const ref = useRef<SVGSVGElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  useEffect(() => {
    const line = lineRef.current
    if (!line) return
    const len = width
    line.style.strokeDasharray = String(len)
    line.style.strokeDashoffset = shouldReduce ? '0' : String(len)
    if (shouldReduce || !inView) return
    const anim = animate(line, {
      strokeDashoffset: [len, 0],
      duration: 700,
      ease: 'inOutQuad',
    })
    return () => {
      anim.revert()
    }
  }, [inView, shouldReduce, width])

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
