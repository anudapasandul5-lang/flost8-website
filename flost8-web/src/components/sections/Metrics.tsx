import { motion, useReducedMotion } from 'framer-motion'
import { METRICS } from '../../lib/config'
import { staggerParent, fadeUp } from '../../lib/motion'

const stats = [
  { value: METRICS.bookingsDriven, label: 'Bookings driven' },
  { value: METRICS.activePartners, label: 'Active partners' },
  { value: METRICS.citiesReached, label: 'Cities reached' },
  { value: METRICS.monthlyReach, label: 'Monthly reach' },
] as const

export function Metrics() {
  const shouldReduce = useReducedMotion()

  return (
    <section className="relative overflow-hidden bg-base py-12 md:py-16">
      <img
        src="/ui2/gen/stage.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-base via-base/85 to-base" />
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-10">
        <motion.div
          className="grid grid-cols-2 divide-x divide-y divide-white/10 border border-white/10 md:grid-cols-4 md:divide-y-0"
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="flex flex-col items-start gap-3 px-6 py-8 md:px-10 md:py-10"
            >
              <span className="font-display text-6xl leading-none text-ink md:text-7xl">
                {stat.value}
                <span className="text-accent">+</span>
              </span>
              <span className="font-grotesk text-xs uppercase tracking-[0.15em] text-[var(--ink-50)] md:text-sm">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
