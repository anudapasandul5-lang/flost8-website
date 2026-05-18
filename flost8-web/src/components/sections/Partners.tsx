import { motion } from 'framer-motion'

const CORE_AREAS = [
  {
    title: 'ARTIST DEVELOPMENT',
    desc: 'Branding, identity, positioning',
    color: 'bg-hot-pink',
  },
  {
    title: 'CONTENT ENGINE',
    desc: 'Reels, live sets, edits, media',
    color: 'bg-cyan',
  },
  {
    title: 'BOOKING SYSTEM',
    desc: 'Events, placements, negotiations',
    color: 'bg-lime',
  },
]

export default function Partners() {
  return (
    <section className="bg-[#4A5580] py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-body text-xs text-white/50 uppercase tracking-widest text-center mb-3"
        >
          We operate across 3 core areas
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-display text-4xl md:text-5xl text-white text-center mb-12 uppercase tracking-tight"
        >
          WHAT WE ACTUALLY DO
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CORE_AREAS.map((area, i) => (
            <motion.div
              key={area.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`${area.color} rounded-2xl p-8`}
            >
              <h3 className="font-display text-2xl text-navy uppercase tracking-wide leading-tight mb-3">
                {area.title}
              </h3>
              <p className="font-body text-navy/70 text-sm">{area.desc}</p>
            </motion.div>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="font-body italic text-white/40 text-center mt-10 text-sm"
        >
          Every performance becomes content + exposure + bookings + growth.
        </motion.p>
      </div>
    </section>
  )
}
