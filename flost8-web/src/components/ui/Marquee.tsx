import { motion } from 'framer-motion'

const items = [
  <>WE <span className="text-black">BUILD</span> ARTISTS.</>,
  <>WE <span className="text-black">CREATE</span> VISIBILITY.</>,
  <>WE <span className="text-navy">DRIVE</span> BOOKINGS.</>,
]

export default function Marquee() {
  return (
    <div className="mask-fade-x group flex min-h-[118px] items-center overflow-hidden bg-red">
      <motion.div
        className="flex shrink-0 items-center gap-16 whitespace-nowrap font-body text-[30px] uppercase tracking-wide text-white group-hover:[animation-play-state:paused]"
        style={{ width: 'max-content' }}
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 22, ease: 'linear', repeat: Infinity }}
      >
        {[0, 1].map(copy => (
          <span key={copy} className="flex items-center gap-16 pr-16">
            {items.map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
