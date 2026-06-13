import { motion } from 'framer-motion'
import { EASE } from '../../lib/motion'
import { useMotionSafe } from '../../hooks/useMotionSafe'

interface RevealLinesProps {
  lines: string[]
  className?: string
  as?: 'h1' | 'h2'
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const lineVariants = {
  hidden: { y: '110%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: EASE } },
}

export default function RevealLines({ lines, className, as = 'h2' }: RevealLinesProps) {
  const { reduce } = useMotionSafe()
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
    <MotionTag
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10%' }}
    >
      {lines.map((line, i) => (
        <span key={line} className="block overflow-hidden">
          <motion.span className="block" variants={lineVariants}>
            {line}
          </motion.span>
          {i < lines.length - 1 && null}
        </span>
      ))}
    </MotionTag>
  )
}
