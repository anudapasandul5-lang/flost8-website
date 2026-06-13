import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowUpRight } from '@phosphor-icons/react'
import { useUpcomingShows } from '../../hooks/useUpcomingShows'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import EyebrowRule from '../ui/EyebrowRule'
import { PUBLIC_ARTISTS } from '../../lib/artistRoster'
import type { UpcomingShow } from '../../lib/bookingContract'

interface ShowRow {
  slug: string | null
  photo: string | null
  dateLabel: string
  title: string
  place: string
}

export function showToRow(show: UpcomingShow): ShowRow {
  const match = PUBLIC_ARTISTS.find(
    (artist) => artist.name.toLowerCase() === show.artist.toLowerCase(),
  )

  return {
    slug: match?.slug ?? null,
    photo: match ? `/photos/${match.slug}.webp` : null,
    dateLabel: show.date,
    title: show.artist,
    place: `${show.venue} · ${show.city}`,
  }
}

function ShowRowCard({ row, reduce }: { row: ShowRow; reduce: boolean }) {
  const rowRef = useRef<HTMLDivElement>(null)
  // Reveal is SCROLL-LINKED: the row rises + fades as it travels from the bottom of
  // the viewport up to centre — so it "comes up" at the pace of the scroll.
  const { scrollYProgress } = useScroll({ target: rowRef, offset: ['start end', 'center center'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 70, damping: 22, restDelta: 0.0005 })
  const y = useTransform(smooth, [0, 1], [130, 0])
  const opacity = useTransform(smooth, [0, 0.85], [0, 1])
  // photo drifts across the full pass for depth
  const { scrollYProgress: pass } = useScroll({ target: rowRef, offset: ['start end', 'end start'] })
  const imgY = useTransform(pass, [0, 1], ['-12%', '12%'])

  return (
    <motion.div
      ref={rowRef}
      className="group relative overflow-hidden rounded-xl md:rounded-2xl min-h-[96px] md:min-h-[128px] edge-refract"
      style={reduce ? undefined : { y, opacity, willChange: 'transform, opacity' }}
    >
      {row.photo ? (
        <motion.div
          className="absolute inset-0"
          style={reduce ? undefined : { y: imgY, willChange: 'transform' }}
        >
          {/* taller than the row so the parallax drift never reveals an edge */}
          <img
            src={row.photo}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="duotone-purple absolute left-0 top-[-18%] h-[136%] w-full object-cover opacity-60 transition-transform duration-[750ms] ease-out group-hover:scale-105"
          />
        </motion.div>
      ) : (
        <div className="absolute inset-0 bg-base-raise" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-base via-base/70 to-transparent" />

      <div className="relative z-10 grid h-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-5 md:px-8 md:py-6">
        <motion.div
          className="min-w-0"
          transition={{ duration: 0.45, ease: 'easeOut' }}
          whileHover={reduce ? undefined : { x: 6 }}
        >
          <p className="font-display text-ink text-3xl md:text-5xl leading-tight truncate">
            {row.title}
          </p>
          <p className="font-grotesk text-[var(--ink-50)] text-sm mt-1 truncate">{row.place}</p>
        </motion.div>

        <div className="bg-accent text-ink font-grotesk font-semibold px-4 py-2 rounded-lg text-sm md:text-[1rem] whitespace-nowrap shrink-0">
          {row.dateLabel}
        </div>
      </div>
    </motion.div>
  )
}

export default function Shows() {
  const { reduce } = useMotionSafe()
  const { shows, loading } = useUpcomingShows(5)

  return (
    <section id="shows" className="relative bg-base py-10 md:py-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="mb-12 md:mb-16">
          <p className="font-grotesk uppercase tracking-[0.25em] text-[13px] text-accent-ink">
            Next up
          </p>
          <EyebrowRule />
          <h2 className="mt-3 font-display text-ink text-5xl md:text-7xl leading-[0.9]">
            UPCOMING SHOWS
          </h2>
        </div>

        {loading && (
          <div className="flex flex-col gap-3 md:gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-xl md:rounded-2xl min-h-[96px] md:min-h-[128px] bg-base-raise edge-refract"
              >
                {reduce ? (
                  <div className="absolute inset-0 bg-base-raise" />
                ) : (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-base-raise via-[var(--accent-soft)] to-base-raise"
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && shows.length === 0 && (
          <div className="rounded-2xl bg-base-raise edge-refract p-10 md:p-14 text-center md:text-left">
            <h3 className="font-display text-ink text-4xl md:text-5xl mb-3">NEW DATES DROPPING SOON</h3>
            <p className="font-grotesk text-[var(--ink-50)] mb-8 max-w-md md:mx-0 mx-auto">
              Get on the list — we announce shows here first.
            </p>
            <Link
              to="/bookings"
              className="inline-flex items-center gap-2 bg-accent text-ink rounded-full px-6 py-3.5 accent-press edge-refract font-grotesk font-semibold"
            >
              Book a Date
              <ArrowUpRight size={20} weight="bold" />
            </Link>
          </div>
        )}

        {!loading && shows.length > 0 && (
          <div className="flex flex-col gap-3 md:gap-4">
            {shows.map((show, index) => (
              <ShowRowCard
                key={`${show.artist}-${show.date}-${index}`}
                row={showToRow(show)}
                reduce={reduce}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
