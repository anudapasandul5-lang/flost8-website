import { motion } from 'framer-motion'
import AudienceCard from '../ui/AudienceCard'

const audienceCards = [
  { title: 'ARTIST',      subtitle: 'We turn DJs into brands.',              ctaLabel: 'Join Roster',  href: 'mailto:bookings@flost8.lk' },
  { title: 'VENUES',      subtitle: 'We bring audience + content.',          ctaLabel: 'Work With Us', href: 'mailto:bookings@flost8.lk' },
  { title: 'BRANDS',      subtitle: 'Direct access to DJs. Natural placement.', ctaLabel: 'Partner Up',   href: 'mailto:bookings@flost8.lk' },
  { title: 'ORGANIZERS',  subtitle: 'Ready-made lineups. Events that perform.', ctaLabel: 'Book Now',     href: '/bookings' },
]

function VinylRecord() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 9, ease: 'linear', repeat: Infinity }}
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
  return (
    <section className="relative overflow-visible bg-gradient-to-r from-[#A376F3] to-[#E979C7] px-4 pb-20 pt-16 sm:px-8 lg:px-10 lg:pb-24 lg:pt-20">
      <VinylRecord />
      <div className="mx-auto max-w-[1280px]">
        <motion.h2
          className="font-display text-[34px] uppercase leading-[1] text-lime sm:text-[44px] md:text-[62px]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        >
          ENTER THE FLOW.
          <br />
          CONTROL THE MOMENT.
        </motion.h2>

        <motion.p
          className="mt-6 max-w-[620px] font-body text-[18px] leading-[1.6] text-white/80"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.15 }}
        >
          FLO ST8 is not just a platform. It's a community where artists collaborate, brands integrate, venues participate, and audiences engage.
        </motion.p>

        <motion.div
          className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}
        >
          {audienceCards.map(card => (
            <motion.div
              key={card.title}
              variants={{ hidden: { opacity: 0, x: 30 }, visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 80, damping: 20 } } }}
            >
              <AudienceCard {...card} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
