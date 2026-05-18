import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarBlank } from '@phosphor-icons/react'
import { APPS_SCRIPT_URL } from '../../lib/config'

interface Show {
  title: string
  artist: string
  date: string
  venue: string
  city: string
}

const PLACEHOLDER_SHOWS: Show[] = [
  { title: 'Neon Nights',      artist: 'DR. GREEN', date: 'Jun 14 2026', venue: 'The Factory',       city: 'Colombo'    },
  { title: 'Sunday Sessions',  artist: 'SONAL',     date: 'Jun 21 2026', venue: 'Arugam Bay Hotel',  city: 'Arugam Bay' },
  { title: 'City Lights',      artist: 'MAALIN',    date: 'Jul 5 2026',  venue: 'Hilton Rooftop',    city: 'Colombo'    },
]

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} className="animate-pulse bg-white/5 h-16 rounded my-2" />
      ))}
    </>
  )
}

function ShowRow({ show }: { show: Show }) {
  return (
    <div className="border-b border-white/10 py-6">
      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-[120px_1fr_1fr_auto] gap-4 items-center">
        <span className="font-display text-2xl text-cyan">{show.date}</span>
        <span className="font-body text-lg font-medium text-white">{show.artist}</span>
        <span className="font-body text-sm text-white/50">{show.venue}, {show.city}</span>
        <Link
          to="/bookings"
          className="border border-red text-red rounded-full px-4 py-1.5 text-sm font-body hover:bg-red hover:text-white transition-colors whitespace-nowrap"
        >
          → Book
        </Link>
      </div>

      {/* Mobile stack */}
      <div className="flex flex-col gap-2 md:hidden">
        <span className="font-display text-xl text-cyan">{show.date}</span>
        <span className="font-body text-lg font-medium text-white">{show.artist}</span>
        <span className="font-body text-sm text-white/50">{show.venue}, {show.city}</span>
        <Link
          to="/bookings"
          className="self-start border border-red text-red rounded-full px-4 py-1.5 text-sm font-body hover:bg-red hover:text-white transition-colors"
        >
          → Book
        </Link>
      </div>
    </div>
  )
}

export default function BookingsPreview() {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!APPS_SCRIPT_URL) {
      setShows(PLACEHOLDER_SHOWS)
      setLoading(false)
      return
    }
    fetch(`${APPS_SCRIPT_URL}?action=upcoming`)
      .then(r => r.json())
      .then(data => {
        setShows((data.shows || data).slice(0, 3))
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  return (
    <section id="shows" className="bg-navy py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* Header */}
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 30 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="font-display text-4xl md:text-6xl text-white uppercase tracking-tight">
            UPCOMING SHOWS
          </h2>
          <div className="mt-3 w-16 h-[3px] bg-red" />
        </motion.div>

        {/* Shows list */}
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 30 }}
          viewport={{ once: true }}
        >
          {loading && <SkeletonRows />}

          {!loading && error && (
            <div className="text-center py-12">
              <p className="font-body text-white/50">Could not load shows. Check back later.</p>
            </div>
          )}

          {!loading && !error && shows.length === 0 && (
            <div className="text-center py-12">
              <p className="font-body text-white/50">No upcoming shows scheduled. Check back soon.</p>
            </div>
          )}

          {!loading && !error && shows.map((show, i) => (
            <ShowRow key={`${show.artist}-${i}`} show={show} />
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 30 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 bg-red text-white font-body font-medium px-8 py-3 rounded-full hover:bg-red/90 transition-colors"
          >
            <CalendarBlank size={18} weight="bold" />
            Book an Artist
          </Link>
        </motion.div>

      </div>
    </section>
  )
}
