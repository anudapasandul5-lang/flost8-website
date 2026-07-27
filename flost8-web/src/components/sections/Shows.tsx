import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import { ArrowUpRight } from '@phosphor-icons/react'
import { useUpcomingShows } from '../../hooks/useUpcomingShows'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import EyebrowRule from '../ui/EyebrowRule'
import { PUBLIC_ARTISTS } from '../../lib/artistRoster'
import type { UpcomingShow } from '../../lib/bookingContract'
import { EASE, SPRING, staggerParent } from '../../lib/motion'

// ---------------------------------------------------------------------------
// Date filtering helpers
// ---------------------------------------------------------------------------

/**
 * Parse a show's display date string into a UTC midnight Date.
 * Handles formats produced by formatShowDate in bookingContract:
 *   "Jun 14, 2026"           (Intl.DateTimeFormat output, may include comma)
 *   "Jun 14 2026"            (PLACEHOLDER_SHOWS format, no comma)
 *   "Jun 14, 2026 - 10:00 PM" (with time suffix)
 * Returns null if unparseable (fail-open: keep the show).
 */
function parseShowDate(dateStr: string): Date | null {
  if (!dateStr) return null
  // Strip any time suffix (everything after " - ")
  const bare = dateStr.split(' - ')[0].trim()
  // Normalise: remove trailing comma so both "Jun 14, 2026" and "Jun 14 2026" parse cleanly
  const normalised = bare.replace(',', '')
  const d = new Date(normalised)
  return isNaN(d.getTime()) ? null : d
}

/** Return today's date at UTC midnight for a stable day-boundary comparison. */
function todayUTC(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

/** Keep shows whose date >= today. Unparseable dates are kept (fail-open). */
function filterFutureShows(shows: UpcomingShow[]): UpcomingShow[] {
  const today = todayUTC()
  return shows.filter((show) => {
    const d = parseShowDate(show.date)
    if (!d) return true // fail-open
    return d >= today
  })
}

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

// ---------------------------------------------------------------------------
// Per-row animation variants (item F)
// ---------------------------------------------------------------------------

/** Row slides in from the left on viewport enter (whileInView stagger child). */
const rowSlide: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
}

/** Date chip pops in with a spring overshoot — delayed slightly after the row. */
const chipPop: Variants = {
  hidden: { opacity: 0, scale: 0.72 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { ...SPRING, delay: 0.18 },
  },
}

function ShowRowCard({ row, reduce }: { row: ShowRow; reduce: boolean }) {
  return (
    <motion.div
      // Item F: whileInView slide — child of the staggerParent list wrapper.
      variants={reduce ? undefined : rowSlide}
      initial={reduce ? undefined : 'hidden'}
      whileInView={reduce ? undefined : 'visible'}
      viewport={{ once: true, margin: '0px 0px -48px 0px' }}
      className="group relative flex min-h-[116px] items-stretch overflow-hidden rounded-xl edge-refract bg-base-raise md:min-h-[140px] md:rounded-2xl"
    >
      {/* Text block */}
      <div className="flex flex-1 flex-col justify-center gap-1.5 px-5 py-5 md:px-8">
        {/* date chip spring-pops in — gated via reduce */}
        <motion.span
          variants={reduce ? undefined : chipPop}
          initial={reduce ? undefined : 'hidden'}
          whileInView={reduce ? undefined : 'visible'}
          viewport={{ once: true }}
          className="mb-1 self-start whitespace-nowrap rounded-md bg-accent px-3 py-1 font-grotesk text-xs font-semibold text-ink md:text-sm"
        >
          {row.dateLabel}
        </motion.span>
        <p className="truncate font-display text-2xl leading-tight text-ink md:text-4xl">
          {row.title}
        </p>
        <p className="truncate font-grotesk text-sm text-[var(--ink-50)]">{row.place}</p>
      </div>

      {/* Portrait — tall narrow right column matches portrait orientation, so the face reads */}
      {row.photo && (
        <div className="relative w-24 shrink-0 overflow-hidden md:w-40">
          <img
            src={row.photo}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0"
          />
          {/* blend the photo's left edge into the card */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-base-raise to-transparent" />
        </div>
      )}
    </motion.div>
  )
}

export default function Shows() {
  const { reduce } = useMotionSafe()
  const { shows: rawShows, loading } = useUpcomingShows(5)
  // Task A: filter to today-or-future only; unparseable dates are kept (fail-open).
  const shows = filterFutureShows(rawShows)

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
              Get on the list. We announce shows here first.
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
          // Item F: staggerParent orchestrates the per-row whileInView stagger.
          // reduce=true → no variants, list renders statically.
          <motion.div
            className="flex flex-col gap-3 md:gap-4"
            variants={reduce ? undefined : staggerParent}
            initial={reduce ? undefined : 'hidden'}
            whileInView={reduce ? undefined : 'visible'}
            viewport={{ once: true, margin: '0px 0px -64px 0px' }}
          >
            {shows.map((show, index) => (
              <ShowRowCard
                key={`${show.artist}-${show.date}-${index}`}
                row={showToRow(show)}
                reduce={reduce}
              />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}
