import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ARTISTS } from '../../lib/config'
import ArtistCard from '../ui/ArtistCard'
import { staggerParent, fadeUp, EASE } from '../../lib/motion'

export default function Roster() {
  const shouldReduce = useReducedMotion()

  return (
    <>
    <div id="roster" />
    <section className="overflow-hidden bg-cream py-section">
      <div className="mx-auto max-w-[1280px] px-gutter">
        <motion.h2
          className="font-league text-display-2xl uppercase leading-none text-navy lg:-ml-gutter"
          initial={shouldReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: EASE }}
        >
          MEET <span className="font-script text-red lowercase">the</span> ROSTER
        </motion.h2>

        {/* Asymmetric roster grid */}
        <motion.div
          className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-12"
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          transition={{ staggerChildren: 0.22, delayChildren: 0.12 }}
        >
          {/* Card 1 — featured */}
          <motion.div variants={fadeUp} className="lg:col-span-5">
            <ArtistCard artist={ARTISTS[0]} index={0} />
          </motion.div>

          {/* Card 2 */}
          <motion.div variants={fadeUp} className="lg:col-span-7 lg:translate-y-6">
            <ArtistCard artist={ARTISTS[1]} index={1} />
          </motion.div>

          {/* Card 3 */}
          <motion.div variants={fadeUp} className="lg:col-span-4 lg:-translate-y-4">
            <ArtistCard artist={ARTISTS[2]} index={2} />
          </motion.div>

          {/* Card 4 */}
          <motion.div variants={fadeUp} className="lg:col-span-4">
            <ArtistCard artist={ARTISTS[3]} index={3} />
          </motion.div>

          {/* Card 5 */}
          <motion.div variants={fadeUp} className="lg:col-span-4 lg:translate-y-6">
            <ArtistCard artist={ARTISTS[4]} index={4} />
          </motion.div>

          {/* Card 6 */}
          <motion.div variants={fadeUp} className="col-span-2 lg:col-span-5 lg:-mt-2">
            <ArtistCard artist={ARTISTS[5]} index={5} />
          </motion.div>

          {/* CTA band — color-inverting */}
          <motion.div variants={fadeUp} className="col-span-2 lg:col-span-7 lg:-mt-2">
            <Link
              to="/bookings"
              className="group flex h-full min-h-[200px] items-center justify-center bg-red transition-colors duration-300 hover:bg-navy lg:min-h-full"
            >
              <p className="text-center font-display text-display-md leading-tight text-cream transition-colors duration-300">
                SEE THE ENTIRE ROSTER
              </p>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
    </>
  )
}
