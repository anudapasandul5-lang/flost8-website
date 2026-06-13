import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { PUBLIC_ARTISTS } from '../../lib/artistRoster'
import { SPRING } from '../../lib/motion'
import EyebrowRule from '../ui/EyebrowRule'
import RevealLines from '../ui/RevealLines'
import { useMotionSafe } from '../../hooks/useMotionSafe'

const AUTO_CYCLE_MS = 3500

export default function Roster() {
  const { reduce } = useMotionSafe()
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  // Refs and scroll hooks declared unconditionally (Rules of Hooks)
  const trackOuter = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: trackOuter, offset: ['start start', 'end end'] })
  const count = PUBLIC_ARTISTS.length
  // Pan so the last card ends flush at the right edge
  const x = useTransform(scrollYProgress, [0, 1], ['0%', `-${((count - 1) / count) * 100}%`])

  useEffect(() => {
    if (reduce || paused) return
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % PUBLIC_ARTISTS.length)
    }, AUTO_CYCLE_MS)

    return () => window.clearInterval(interval)
  }, [reduce, paused])

  return (
    <section id="roster" className="relative bg-base py-10 md:py-20">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
          Names that move rooms
        </p>
        <EyebrowRule />
        <RevealLines lines={['THE ROSTER']} className="mt-3 font-display text-5xl leading-[0.9] text-ink md:text-7xl" />
        <p className="mt-4 max-w-[60ch] font-grotesk text-[1rem] text-[var(--ink-72)] md:text-lg">
          We build the people, the sound, and the rooms they take over — not a roster we rent out by the hour.
        </p>
      </div>

      {/* Desktop — pinned horizontal scroll (motion-safe only) */}
      {!reduce && (
        <div ref={trackOuter} className="relative hidden h-[300vh] md:block">
          <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
            <motion.div
              style={{ x, willChange: 'transform' }}
              className="flex gap-4 px-6 md:px-10"
            >
              {PUBLIC_ARTISTS.map((artist, index) => (
                <div
                  key={artist.slug}
                  className="relative h-[70vh] w-[78vw] shrink-0 overflow-hidden rounded-2xl edge-refract sm:w-[60vw] lg:w-[44vw]"
                >
                  <img
                    src={`/photos/${artist.slug}.webp`}
                    alt={artist.name}
                    loading="lazy"
                    className="grade-portrait absolute inset-0 h-full w-full object-cover"
                  />

                  {/* Bottom legibility scrim */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base via-base/30 to-transparent" />

                  {/* Number */}
                  <span className="absolute left-4 top-4 font-display text-2xl text-accent md:left-6 md:top-6">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  {/* Bottom content */}
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
                    <p className="font-display text-5xl leading-[0.95] text-ink lg:text-6xl">
                      {artist.name}
                    </p>
                    <p className="mt-2 font-grotesk text-xs uppercase tracking-wide text-[var(--ink-50)] md:text-sm">
                      {artist.role}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <Link
                        to={`/bookings?artist=${artist.slug}`}
                        className="accent-press edge-refract inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-grotesk text-sm text-ink"
                      >
                        Book Now
                      </Link>
                      <Link
                        to={`/bookings?artist=${artist.slug}`}
                        className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--accent-line)] px-5 py-2.5 font-grotesk text-sm text-ink transition-colors hover:bg-[var(--accent-soft)]"
                      >
                        View Artist
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      )}

      {/* Desktop — reduced-motion fallback: accordion (unchanged) */}
      {reduce && (
        <div
          className="mt-12 hidden max-w-[1500px] gap-1.5 px-6 md:mt-16 md:flex md:h-[560px] md:px-10 lg:h-[460px]"
          onMouseLeave={() => setPaused(false)}
        >
          {PUBLIC_ARTISTS.map((artist, index) => {
            const isActive = index === activeIndex

            return (
              <motion.div
                key={artist.slug}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                aria-label={`${artist.name} — ${artist.role}`}
                className="group relative cursor-pointer overflow-hidden rounded-2xl edge-refract"
                layout
                animate={undefined}
                initial={false}
                transition={{ duration: 0 }}
                style={{ flexGrow: isActive ? 6 : 1, flexBasis: 0 }}
                onMouseEnter={() => {
                  setPaused(true)
                  setActiveIndex(index)
                }}
                onFocus={() => {
                  setPaused(true)
                  setActiveIndex(index)
                }}
                onClick={() => setActiveIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setActiveIndex(index)
                  }
                }}
              >
                <img
                  src={`/photos/${artist.slug}.webp`}
                  alt={artist.name}
                  loading="lazy"
                  className={`grade-portrait absolute inset-0 h-full w-full object-cover ${isActive ? 'is-active' : ''}`}
                />

                {/* Bottom legibility scrim */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base via-base/30 to-transparent" />

                {/* Active content */}
                {isActive && (
                  <>
                    <span className="absolute left-4 top-4 font-display text-2xl text-accent md:left-6 md:top-6">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
                      <p className="font-display text-4xl leading-[0.95] text-ink md:text-6xl">
                        {artist.name}
                      </p>
                      <p className="mt-2 font-grotesk text-xs uppercase tracking-wide text-[var(--ink-50)] md:text-sm">
                        {artist.role}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        <Link
                          to={`/bookings?artist=${artist.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-press edge-refract inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-grotesk text-sm text-ink"
                        >
                          Book Now
                        </Link>
                        <Link
                          to={`/bookings?artist=${artist.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--accent-line)] px-5 py-2.5 font-grotesk text-sm text-ink transition-colors hover:bg-[var(--accent-soft)]"
                        >
                          View Artist
                        </Link>
                      </div>
                    </div>
                  </>
                )}

                {/* Inactive content — vertical label */}
                {!isActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <span className="font-display text-lg text-accent">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap font-grotesk text-sm uppercase tracking-[0.2em] text-[var(--ink-50)]">
                      {artist.name}
                    </span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Mobile — vertical accordion (always rendered, unchanged) */}
      <div className="mt-12 flex flex-col gap-1.5 px-6 md:hidden">
        {PUBLIC_ARTISTS.map((artist, index) => {
          const isActive = index === activeIndex

          return (
            <motion.div
              key={artist.slug}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={`${artist.name} — ${artist.role}`}
              className="group relative cursor-pointer overflow-hidden rounded-2xl edge-refract"
              layout
              animate={reduce ? undefined : { height: isActive ? 360 : 64 }}
              initial={false}
              transition={reduce ? { duration: 0 } : SPRING}
              style={{ height: reduce ? (isActive ? 360 : 64) : undefined }}
              onClick={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setActiveIndex(index)
                }
              }}
            >
              <img
                src={`/photos/${artist.slug}.webp`}
                alt={artist.name}
                loading="lazy"
                className={`grade-portrait absolute inset-0 h-full w-full object-cover ${isActive ? 'is-active' : ''}`}
              />

              {/* Bottom legibility scrim */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base via-base/30 to-transparent" />

              {isActive ? (
                <>
                  <span className="absolute left-4 top-4 font-display text-2xl text-accent">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="font-display text-4xl leading-[0.95] text-ink">
                      {artist.name}
                    </p>
                    <p className="mt-2 font-grotesk text-xs uppercase tracking-wide text-[var(--ink-50)]">
                      {artist.role}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <Link
                        to={`/bookings?artist=${artist.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-press edge-refract inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-grotesk text-sm text-ink"
                      >
                        Book Now
                      </Link>
                      <Link
                        to={`/bookings?artist=${artist.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--accent-line)] px-5 py-2.5 font-grotesk text-sm text-ink transition-colors hover:bg-[var(--accent-soft)]"
                      >
                        View Artist
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-between px-4">
                  <span className="font-display text-2xl leading-none text-ink">
                    {artist.name}
                  </span>
                  <span className="font-display text-lg text-accent">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
