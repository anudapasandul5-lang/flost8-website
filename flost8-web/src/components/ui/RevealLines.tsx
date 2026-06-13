import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { useMotionSafe } from '../../hooks/useMotionSafe'

interface RevealLinesProps {
  lines: string[]
  className?: string
  as?: 'h1' | 'h2'
}

/** One headline line — rises + fades, driven by the heading's scroll progress. */
function Line({
  line,
  index,
  total,
  progress,
}: {
  line: string
  index: number
  total: number
  progress: MotionValue<number>
}) {
  // small per-line cascade for multi-line headings
  const start = total > 1 ? index * 0.18 : 0
  const y = useTransform(progress, [start, start + 0.7], ['110%', '0%'])
  const opacity = useTransform(progress, [start, start + 0.5], [0, 1])
  return (
    <span className="block overflow-hidden">
      <motion.span className="block" style={{ y, opacity, willChange: 'transform, opacity' }}>
        {line}
      </motion.span>
    </span>
  )
}

export default function RevealLines({ lines, className, as = 'h2' }: RevealLinesProps) {
  const { reduce } = useMotionSafe()
  const ref = useRef<HTMLHeadingElement>(null)
  // Scroll-LINKED: the heading rises as it travels from the viewport bottom up toward
  // centre, at the pace of the scroll — matching the Upcoming Shows reveal.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start center'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 60, damping: 24, restDelta: 0.0005 })
  const Tag = as

  if (reduce) {
    return (
      <Tag className={className}>
        {lines.map((line, i) => (
          <span key={line}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </Tag>
    )
  }

  const MotionTag = motion[as]

  return (
    <MotionTag ref={ref} className={className} aria-label={lines.join(' ')}>
      {lines.map((line, i) => (
        <Line key={line} line={line} index={i} total={lines.length} progress={smooth} />
      ))}
    </MotionTag>
  )
}
