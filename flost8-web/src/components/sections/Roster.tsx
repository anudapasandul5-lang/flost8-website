import { motion, useReducedMotion } from 'framer-motion'
import { FunnelSimple, Headphones } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { ARTISTS } from '../../lib/config'
import ArtistCard from '../ui/ArtistCard'
import { staggerParent, fadeUp, EASE } from '../../lib/motion'

const row1 = ARTISTS.slice(0, 4)
const row2 = ARTISTS.slice(4, 6)

export default function Roster() {
  const shouldReduce = useReducedMotion()

  return (
    <section id="roster" className="scroll-mt-20 bg-[#F1EFEC] pt-16 pb-24">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8 lg:px-12">
        <motion.h2
          className="text-center font-script text-[56px] uppercase leading-none text-red sm:text-[72px] lg:text-[84px]"
          initial={shouldReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          Meet The Roster
        </motion.h2>

        <motion.div
          className="mt-3 flex flex-wrap justify-end gap-3 md:mt-4"
          initial={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
        >
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-red px-6 py-3 font-body italic text-white shadow-[0_3px_8px_rgba(0,0,0,0.25)] transition-transform active:scale-[0.98] hover:-translate-y-0.5"
          >
            <Headphones size={18} weight="bold" />
            All Roster
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-black bg-[#F1EFEC] px-5 py-3 font-body italic text-black transition-transform active:scale-[0.98] hover:-translate-y-0.5"
          >
            <FunnelSimple size={18} weight="bold" />
            Filter
          </button>
        </motion.div>

        {/* Row 1 — 4 artists */}
        <motion.div
          className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4"
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {row1.map((artist, index) => (
            <motion.div key={artist.slug} variants={fadeUp}>
              <ArtistCard artist={artist} index={index} />
            </motion.div>
          ))}
        </motion.div>

        {/* Row 2 — 2 artists + "See the entire roster" tile */}
        <motion.div
          className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4"
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {row2.map((artist, index) => (
            <motion.div key={artist.slug} variants={fadeUp}>
              <ArtistCard artist={artist} index={index + 4} />
            </motion.div>
          ))}

          <motion.div variants={fadeUp} className="col-span-2">
            <Link
              to="/bookings"
              className="flex h-full min-h-[200px] items-center justify-center bg-navy transition-opacity hover:opacity-90"
            >
              <p className="text-center font-display text-[38px] leading-tight text-white lg:text-[48px]">
                SEE THE<br />ENTIRE ROSTER
              </p>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
