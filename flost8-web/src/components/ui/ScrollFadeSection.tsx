import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

/**
 * Wraps a section; scrubs opacity tied to scroll position.
 * Fades in near the bottom edge, holds full opacity through the reading zone,
 * fades out near the top edge. `noFadeOut` keeps it full once entered — use for
 * the last section (Footer), which can't be scrolled past and would otherwise
 * sit permanently dimmed.
 */
export default function ScrollFadeSection({
  children,
  noFadeOut = false,
}: {
  children: ReactNode
  noFadeOut?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const shouldReduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  // Hold plateau: full opacity through the middle 56% so content stays readable;
  // fade only near the viewport edges.
  const opacity = useTransform(
    scrollYProgress,
    noFadeOut ? [0, 0.22, 1] : [0, 0.22, 0.78, 1],
    noFadeOut ? [0, 1, 1] : [0, 1, 1, 0],
  )
  return (
    <motion.div ref={ref} style={shouldReduce ? undefined : { opacity, willChange: 'opacity' }}>
      {children}
    </motion.div>
  )
}
