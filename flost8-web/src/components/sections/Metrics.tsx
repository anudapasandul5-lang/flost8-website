import { motion, useReducedMotion } from 'framer-motion'
import { METRICS } from '../../lib/config'
import { EASE } from '../../lib/motion'

const stats = [
  {
    value: METRICS.bookingsDriven,
    label: 'BOOKINGS DRIVEN',
    size: 'text-display-2xl',
    color: 'text-red',
  },
  {
    value: METRICS.activePartners,
    label: 'ACTIVE PARTNERS',
    size: 'text-display-xl',
    color: 'text-navy',
  },
  {
    value: METRICS.citiesReached,
    label: 'CITIES REACHED',
    size: 'text-display-lg',
    color: 'text-purple',
  },
  {
    value: METRICS.monthlyReach,
    label: 'MONTHLY CONTENT REACH',
    size: 'text-display-md',
    color: 'text-navy',
  },
] as const

export function Metrics() {
  const shouldReduce = useReducedMotion()

  return (
    <section id="metrics" className="bg-cream px-gutter py-section">
      <div className="mx-auto max-w-[1280px]">
        <motion.h2
          className="text-left font-display text-[32px] uppercase leading-none text-red sm:text-[44px] lg:text-[52px]"
          initial={shouldReduce ? 'visible' : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: EASE }}
        >
          METRICS RIGHT NOW
        </motion.h2>

        <div className="mt-12 flex flex-col lg:mt-16">
          {stats.map((stat, index) => (
            <div key={stat.label}>
              <motion.div
                className="flex flex-col items-baseline gap-2 py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 lg:py-8"
                initial={shouldReduce ? 'visible' : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 1, ease: EASE, delay: shouldReduce ? 0 : index * 0.1 }}
              >
                <span
                  className={`${stat.size} font-display uppercase leading-[0.9] ${stat.color}`}
                >
                  {stat.value}
                </span>
                <span className="font-body text-sm uppercase tracking-wide text-off-black sm:text-base">
                  {stat.label}
                </span>
              </motion.div>

              <motion.div
                className="h-[2px] w-full origin-left bg-off-black/20"
                initial={shouldReduce ? { scaleX: 1 } : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={shouldReduce ? { duration: 0 } : { duration: 1, ease: EASE, delay: index * 0.1 }}
              />
            </div>
          ))}
        </div>

        <motion.p
          className="mt-14 text-right font-league text-[44px] uppercase leading-[1.15] text-navy sm:text-[58px] lg:mt-28 lg:text-[72px]"
          initial={shouldReduce ? 'visible' : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: EASE }}
        >
          We don&apos;t run ads.
          <br />
          We run <span className="font-script text-red">rooms.</span>
        </motion.p>
      </div>
    </section>
  )
}
