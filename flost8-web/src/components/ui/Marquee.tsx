import { motion } from 'framer-motion'

interface MarqueeProps {
  speed?: number
}

const BAND_TEXT = 'WE BUILD ARTISTS.  ·  WE CREATE VISIBILITY.  ·  WE DRIVE BOOKINGS.  ·  '

export default function Marquee({ speed = 20 }: MarqueeProps) {
  return (
    <div className="w-full bg-red py-4 overflow-hidden" aria-hidden="true">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ['0%', '-33.333%'] }}
        transition={{ duration: speed, ease: 'linear', repeat: Infinity }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="font-display text-xl md:text-2xl text-white tracking-widest uppercase flex-shrink-0 pr-0"
          >
            {BAND_TEXT}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
