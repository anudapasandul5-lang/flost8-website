import { motion } from 'framer-motion'
import AudienceCard from '../ui/AudienceCard'

const AUDIENCE_CARDS = [
  { title: 'ARTIST',     subtitle: 'We turn DJs into brands.',              href: '#bookings',                 ctaLabel: 'Join Roster' },
  { title: 'VENUES',     subtitle: 'We bring audience + content.',          href: '#bookings',                 ctaLabel: 'Work With Us' },
  { title: 'BRANDS',     subtitle: 'Direct access to DJs. Natural placement.', href: 'mailto:bookings@flost8.lk', ctaLabel: 'Partner Up' },
  { title: 'ORGANIZERS', subtitle: 'Ready-made lineups. Events that perform.', href: '#bookings',                 ctaLabel: 'Book Now' },
]

function VinylRecord() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
      className="w-64 h-64 md:w-80 md:h-80 mx-auto"
    >
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Outer record */}
        <circle cx="100" cy="100" r="98" fill="#111118" />
        {/* Grooves */}
        {[85, 70, 55, 40].map(r => (
          <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#222" strokeWidth="1" />
        ))}
        {/* Center label */}
        <circle cx="100" cy="100" r="25" fill="#E63946" />
        <circle cx="100" cy="100" r="4" fill="#111118" />
        {/* Highlight */}
        <circle cx="100" cy="100" r="98" fill="none" stroke="#333" strokeWidth="2" />
      </svg>
    </motion.div>
  )
}

export default function Services() {
  return (
    <section className="bg-purple py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center gap-12 md:gap-16">
          {/* Left column */}
          <div className="flex-1 md:basis-3/5">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="font-display text-4xl md:text-6xl text-lime whitespace-pre-line leading-none"
            >
              {'ENTER THE FLOW.\nCONTROL THE MOMENT.'}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-body text-white/60 text-base mt-4"
            >
              FLO ST8 is not just a platform. It's a community where artists collaborate, brands integrate, venues participate, and audiences engage.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8"
            >
              {AUDIENCE_CARDS.map(card => (
                <AudienceCard key={card.title} {...card} />
              ))}
            </motion.div>
          </div>

          {/* Right column — vinyl */}
          <div className="order-first md:order-none flex-1 md:basis-2/5 flex items-center justify-center">
            <VinylRecord />
          </div>
        </div>
      </div>
    </section>
  )
}
