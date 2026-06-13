import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useMotionSafe } from '../../hooks/useMotionSafe'

/**
 * Perspective section transition: pins the wrapped (leaving) section and scales +
 * rounds it as it exits, so the NEXT section scrolls up and over it for a 3D-depth
 * seam. Reduced-motion renders the section plainly (no pin / transform).
 */
export default function PerspectiveSeam({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const { reduce } = useMotionSafe()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9])
  const borderRadius = useTransform(scrollYProgress, [0, 1], ['0px', '36px'])
  const opacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1, 0.55])

  if (reduce) return <div>{children}</div>

  return (
    <motion.div
      ref={ref}
      style={{ scale, borderRadius, opacity, transformOrigin: 'center top', willChange: 'transform' }}
      className="sticky top-0 overflow-hidden"
    >
      {children}
    </motion.div>
  )
}
