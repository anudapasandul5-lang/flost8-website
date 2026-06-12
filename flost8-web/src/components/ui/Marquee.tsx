import { motion } from 'framer-motion'
import { useMotionSafe } from '../../hooks/useMotionSafe'

const base = [
  <>WE <span className="text-navy">CONNECT</span> CULTURE.</>,
  <>WE <span className="text-black">RUN</span> THE SHOW.</>,
  <>WE <span className="text-navy">MAKE</span> THE MOMENT.</>,
]
const items = [...base, ...base]

export default function Marquee() {
  const { reduce } = useMotionSafe()

  return (
    <div className="mask-fade-x group flex h-9 items-center overflow-hidden bg-red">
      <motion.div
        className="flex shrink-0 items-center whitespace-nowrap font-body text-[11px] uppercase tracking-widest text-white group-hover:[animation-play-state:paused]"
        style={{ width: 'max-content' }}
        animate={reduce ? false : { x: ['0%', '-50%'] }}
        transition={reduce ? undefined : { duration: 28, ease: 'linear', repeat: Infinity }}
      >
        {[0, 1].map(copy => (
          <span key={copy} className="flex items-center">
            {items.map((item, i) => (
              <span key={i} className="flex items-center gap-3 px-3">
                {item}
                <span className="opacity-50">·</span>
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
