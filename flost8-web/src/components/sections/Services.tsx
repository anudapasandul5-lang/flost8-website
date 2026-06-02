import { motion, useReducedMotion } from 'framer-motion'
import AudienceCard from '../ui/AudienceCard'
import { staggerParent, fadeUp, EASE } from '../../lib/motion'

const audienceCards = [
  { title: 'ARTIST',      subtitle: 'We turn DJs into brands.',              ctaLabel: 'Join Roster',  href: 'mailto:bookings@flost8.lk' },
  { title: 'VENUES',      subtitle: 'We bring audience + content.',          ctaLabel: 'Work With Us', href: 'mailto:bookings@flost8.lk' },
  { title: 'BRANDS',      subtitle: 'Direct access to DJs. Natural placement.', ctaLabel: 'Partner Up',   href: 'mailto:bookings@flost8.lk' },
  { title: 'ORGANIZERS',  subtitle: 'Ready-made lineups. Events that perform.', ctaLabel: 'Book Now',     href: '/bookings' },
]

function VinylRecord({ shouldReduce }: { shouldReduce: boolean | null }) {
  return (
    <motion.div
      animate={shouldReduce ? { rotate: 0 } : { rotate: 360 }}
      transition={shouldReduce ? { duration: 0 } : { duration: 9, ease: 'linear', repeat: Infinity }}
      className="pointer-events-none absolute -top-[120px] right-[70px] hidden h-[340px] w-[340px] rounded-full bg-purple/35 p-5 shadow-[0_16px_26px_rgba(0,0,0,0.25)] lg:block"
    >
      <svg viewBox="0 0 240 240" className="h-full w-full">
        <circle cx="120" cy="120" r="112" fill="#050505" />
        {[100, 88, 76, 64, 52].map(radius => (
          <circle key={radius} cx="120" cy="120" r={radius} fill="none" stroke="#232323" strokeWidth="1.5" />
        ))}
        <circle cx="120" cy="120" r="42" fill="#C73D3E" stroke="#fff" strokeWidth="3" />
        <circle cx="120" cy="120" r="5" fill="#050505" />
      </svg>
    </motion.div>
  )
}

export default function Services() {
  const shouldReduce = useReducedMotion()

  return (
    <section className="relative overflow-visible bg-gradient-to-r from-[#A376F3] to-[#E979C7] px-4 pb-20 pt-16 sm:px-8 lg:px-10 lg:pb-24 lg:pt-20">
      <VinylRecord shouldReduce={shouldReduce} />
      <div className="mx-auto max-w-[1280px]">
        <motion.h2
          className="font-display text-[34px] uppercase leading-[1] text-lime sm:text-[44px] md:text-[62px]"
          initial={shouldReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          ENTER THE FLOW.
          <br />
          CONTROL THE MOMENT.
        </motion.h2>

        <motion.p
          className="mt-6 max-w-[620px] font-body text-[18px] leading-[1.6] text-white/80"
          initial={shouldReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
        >
          FLO ST8 is not just a platform. It's a community where artists collaborate, brands integrate, venues participate, and audiences engage.
        </motion.p>

        <motion.div
          className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2"
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {audienceCards.map(card => (
            <motion.div
              key={card.title}
              variants={fadeUp}
            >
              <AudienceCard {...card} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
