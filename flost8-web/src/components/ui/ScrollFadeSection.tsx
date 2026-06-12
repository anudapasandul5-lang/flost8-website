import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

/** Wraps a section; scrubs opacity 0→1 on entry, 1→0 on exit, tied to scroll position. */
export default function ScrollFadeSection({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const shouldReduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0])
  return (
    <motion.div ref={ref} style={shouldReduce ? undefined : { opacity, willChange: 'opacity' }}>
      {children}
    </motion.div>
  )
}
