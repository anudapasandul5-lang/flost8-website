import { motion, useReducedMotion } from 'framer-motion'
import { METRICS } from '../../lib/config'
import { StatCard } from '../ui/StatCard'
import { staggerParent, scaleIn, EASE } from '../../lib/motion'

const stats = [
  { value: METRICS.bookingsDriven, label: 'BOOKINGS\nDRIVEN' },
  { value: METRICS.activePartners, label: 'ACTIVE\nPARTNERS' },
  { value: METRICS.citiesReached, label: 'CITIES\nREACHED' },
  { value: METRICS.monthlyReach, label: 'MONTHLY\nCONTENT REACH' },
] as const

export function Metrics() {
  const shouldReduce = useReducedMotion()

  return (
    <section id="metrics" className="bg-[#5E79A6] px-4 pb-16 pt-16 sm:px-8 lg:px-10 lg:pt-[150px]">
      <div className="mx-auto max-w-[1280px]">
        <motion.h2
          className="text-center font-display text-[32px] uppercase leading-none text-lime sm:text-[44px] lg:text-[52px]"
          initial={shouldReduce ? 'visible' : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          METRICS RIGHT NOW
        </motion.h2>

        <motion.div
          className="mt-14 grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-9"
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {stats.map((stat, index) => (
            <motion.div key={stat.label} variants={scaleIn}>
              <StatCard value={stat.value} label={stat.label} index={index} />
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          className="mt-14 text-center font-script text-[44px] uppercase leading-[1.15] text-lime sm:text-[58px] lg:mt-28 lg:text-[72px]"
          initial={shouldReduce ? 'visible' : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          We don&apos;t run ads.
          <br />
          We run rooms.
        </motion.p>
      </div>
    </section>
  )
}
