import { motion } from 'framer-motion'

const PARTNERS = ['PARTNER', 'PARTNER', 'PARTNER', 'PARTNER', 'PARTNER']

export default function Partners() {
  return (
    <section className="bg-[#4A5580] py-12">
      <div className="max-w-4xl mx-auto px-4">
        <p className="font-body text-xs text-white/50 uppercase tracking-widest text-center mb-4">
          TRUSTED BY
        </p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl px-8 md:px-16 py-8 border border-red/20"
        >
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {PARTNERS.map((name, i) => (
              <span
                key={i}
                className="font-display text-2xl text-off-black/40 uppercase tracking-wider"
              >
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
