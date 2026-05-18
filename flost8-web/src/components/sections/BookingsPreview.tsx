import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowCircleRight } from '@phosphor-icons/react'
import { useUpcomingShows } from '../../hooks/useUpcomingShows'
import type { UpcomingShow } from '../../lib/bookingContract'

const fallbackShows: UpcomingShow[] = [
  { date: 'JUN 14 2026', artist: 'DR. GREEN', venue: 'The Factory', city: 'Colombo' },
  { date: 'JUL 05 2026', artist: 'SONAL', venue: 'Ballroom 47', city: 'Colombo' },
  { date: 'AUG 22 2026', artist: 'MAALIN', venue: 'Rooftop Stage', city: 'Galle' },
]

function ShowRow({ show, index }: { show: UpcomingShow; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ type: 'spring', stiffness: 80, damping: 20, delay: index * 0.12 }}
      className="grid grid-cols-1 items-start gap-2 rounded-[24px] border-[3px] border-cyan bg-[#5C98B2] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:rounded-full sm:border-[4px] sm:px-10 sm:py-4 md:min-h-[86px] md:grid-cols-[280px_220px_1fr_auto] md:items-center md:gap-5"
    >
      <span className="font-display text-[28px] leading-none text-white sm:text-[38px]">{show.date}</span>
      <span className="font-body text-[20px] uppercase leading-none text-white sm:text-[28px]">{show.artist}</span>
      <span className="font-body text-[18px] italic leading-none text-white/80 sm:text-[28px] sm:text-white">
        {show.venue}, {show.city}
      </span>
      <Link
        to="/bookings"
        className="inline-flex items-center justify-center gap-4 justify-self-start rounded-full bg-navy py-2 pl-1 pr-6 font-body italic text-white transition-transform hover:-translate-y-0.5 active:scale-[0.98] md:justify-self-end"
      >
        <ArrowCircleRight size={42} weight="fill" className="text-cyan" />
        Book Now
      </Link>
    </motion.div>
  )
}

export default function BookingsPreview() {
  const { shows, loading } = useUpcomingShows(3)
  const displayShows = loading || shows.length === 0 ? fallbackShows : shows.slice(0, 3)

  return (
    <section id="shows" className="scroll-mt-20 bg-navy px-4 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[1220px]">
        <motion.h2
          className="text-center font-script text-[40px] uppercase leading-none text-cyan sm:text-[54px] lg:text-[62px]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        >
          Upcoming Shows
        </motion.h2>

        <div className="mt-16 grid gap-10">
          {displayShows.map((show, index) => (
            <ShowRow key={`${show.artist}-${show.date}-${index}`} show={show} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
