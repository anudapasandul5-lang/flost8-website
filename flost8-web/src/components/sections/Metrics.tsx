import { motion } from 'framer-motion'
import { METRICS } from '../../lib/config'
import { StatCard } from '../ui/StatCard'

const stats = [
  { value: METRICS.bookingsDriven, label: 'BOOKINGS DRIVEN' },
  { value: METRICS.activePartners,  label: 'ACTIVE PARTNERS' },
  { value: METRICS.citiesReached,   label: 'CITIES REACHED' },
  { value: METRICS.monthlyReach,    label: 'MONTHLY CONTENT REACH' },
] as const

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden:  { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 100, damping: 20 },
  },
}

export function Metrics() {
  return (
    <section id="metrics" className="bg-[#4A5580] py-20 md:py-28">
      <div className="px-4 md:px-8 max-w-5xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl text-lime uppercase tracking-widest text-center mb-12">
          METRICS RIGHT NOW
        </h2>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {stats.map((stat, i) => (
            <motion.div key={stat.label} variants={itemVariants}>
              <StatCard value={stat.value} label={stat.label} index={i} />
            </motion.div>
          ))}
        </motion.div>

        <p className="font-script text-3xl md:text-4xl text-lime text-center mt-16 leading-tight italic">
          WE DON&apos;T RUN ADS.<br />
          WE RUN ROOMS.
        </p>
      </div>
    </section>
  )
}
