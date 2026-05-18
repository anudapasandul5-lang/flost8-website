import { motion } from 'framer-motion'
import { METRICS } from '../../lib/config'
import { StatCard } from '../ui/StatCard'

const stats = [
  { value: METRICS.bookingsDriven, label: 'BOOKINGS\nDRIVEN' },
  { value: METRICS.activePartners, label: 'ACTIVE\nPARTNERS' },
  { value: METRICS.citiesReached, label: 'CITIES\nREACHED' },
  { value: METRICS.monthlyReach, label: 'MONTHLY\nCONTENT REACH' },
] as const

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 80, damping: 20 } },
}

export function Metrics() {
  return (
    <section id="metrics" className="bg-[#5E79A6] px-4 pb-16 pt-16 sm:px-8 lg:px-10 lg:pt-[150px]">
      <div className="mx-auto max-w-[1280px]">
        <motion.h2
          className="text-center font-display text-[32px] uppercase leading-none text-lime sm:text-[44px] lg:text-[52px]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        >
          METRICS RIGHT NOW
        </motion.h2>

        <motion.div
          className="mt-14 grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-9"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {stats.map((stat, index) => (
            <motion.div key={stat.label} variants={item}>
              <StatCard value={stat.value} label={stat.label} index={index} />
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          className="mt-14 text-center font-script text-[36px] uppercase leading-[1.15] text-lime sm:text-[48px] lg:mt-28 lg:text-[58px]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 70, damping: 20 }}
        >
          We don&apos;t run ads.
          <br />
          We run rooms.
        </motion.p>
      </div>
    </section>
  )
}
