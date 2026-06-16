import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, animate } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { PUBLIC_ARTISTS } from '../../lib/artistRoster'
import { SPRING } from '../../lib/motion'
import EyebrowRule from '../ui/EyebrowRule'
import RevealLines from '../ui/RevealLines'
import { useMotionSafe } from '../../hooks/useMotionSafe'

const GAP = 16 // px between cards

export default function Roster() {
  const { reduce } = useMotionSafe()
  const [activeIndex, setActiveIndex] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  // Card step in px (card width + gap), measured after layout
  const [cardStep, setCardStep] = useState(0)
  // Centering offset so the active card sits centered
  const [centerOffset, setCenterOffset] = useState(0)
  // Viewport width (for end-anchoring so no dead space past first/last card)
  const [viewportW, setViewportW] = useState(0)

  // Framer motion x value for the track
  const x = useMotionValue(0)

  // ── Measure card dimensions after layout and on resize ──────────────────────
  const measure = useCallback(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return
    const firstCard = track.firstElementChild as HTMLElement | null
    if (!firstCard) return
    const cardW = firstCard.getBoundingClientRect().width
    const viewportW = viewport.getBoundingClientRect().width
    const step = cardW + GAP
    const offset = (viewportW - cardW) / 2
    setCardStep(step)
    setCenterOffset(offset)
    setViewportW(viewportW)
  }, [])

  useLayoutEffect(() => {
    measure()
    const observer = new ResizeObserver(measure)
    if (viewportRef.current) observer.observe(viewportRef.current)
    return () => observer.disconnect()
  }, [measure])

  // ── Sync x to activeIndex ────────────────────────────────────────────────────
  useEffect(() => {
    if (cardStep === 0) return
    // Edge inset so the first/last card sits a touch off the viewport edge,
    // roughly aligned with the section's horizontal padding.
    const PAD = viewportW >= 768 ? 40 : 24
    const trackW = PUBLIC_ARTISTS.length * cardStep - GAP
    const raw = centerOffset - activeIndex * cardStep
    // Anchor the ends: never reveal dead space left of the first card or
    // right of the last. Middle cards still center normally.
    const maxX = PAD
    const minX = Math.min(PAD, viewportW - PAD - trackW)
    const targetX = Math.max(minX, Math.min(maxX, raw))
    if (reduce) {
      x.set(targetX)
    } else {
      animate(x, targetX, { ...SPRING })
    }
  }, [activeIndex, cardStep, centerOffset, viewportW, reduce, x])

  // ── Reset to DR. GREEN on section enter ─────────────────────────────────────
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setActiveIndex(0)
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(0, i - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(PUBLIC_ARTISTS.length - 1, i + 1))
      }
    },
    [],
  )

  // ── Drag snap ───────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (cardStep === 0) return
      const threshold = cardStep * 0.25
      const velocity = info.velocity.x
      const offset = info.offset.x

      let next = activeIndex
      if (Math.abs(velocity) > 300) {
        next = velocity < 0
          ? Math.min(PUBLIC_ARTISTS.length - 1, activeIndex + 1)
          : Math.max(0, activeIndex - 1)
      } else if (offset < -threshold) {
        next = Math.min(PUBLIC_ARTISTS.length - 1, activeIndex + 1)
      } else if (offset > threshold) {
        next = Math.max(0, activeIndex - 1)
      }
      setActiveIndex(next)
    },
    [activeIndex, cardStep],
  )

  const atStart = activeIndex === 0
  const atEnd = activeIndex === PUBLIC_ARTISTS.length - 1

  return (
    <section id="roster" ref={sectionRef} className="relative bg-base py-10 md:py-20">
      {/* ── Header ── */}
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
          Names that move rooms
        </p>
        <EyebrowRule />
        <RevealLines
          lines={['THE ROSTER']}
          className="mt-3 font-display text-5xl leading-[0.9] text-ink md:text-7xl"
        />
        <p className="mt-4 max-w-[60ch] font-grotesk text-[1rem] text-[var(--ink-72)] md:text-lg">
          We build the people, the sound, and the rooms they take over — not a roster we rent out by the hour.
        </p>
      </div>

      {/* ── Carousel region ── */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Artist roster"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="mt-12 outline-none md:mt-16 focus-visible:ring-0"
      >
        {/* Viewport: clips the overflowing track */}
        <div
          ref={viewportRef}
          className="relative overflow-hidden"
          style={{ cursor: reduce ? 'default' : 'grab' }}
        >
          {/* Track */}
          <motion.div
            ref={trackRef}
            drag={reduce ? false : 'x'}
            dragConstraints={viewportRef}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            style={{ x, willChange: 'transform', touchAction: 'pan-y' }}
            className="flex"
            // gap via inline style so the JS gap constant matches
          >
            {PUBLIC_ARTISTS.map((artist, index) => {
              const isActive = index === activeIndex

              return (
                <motion.div
                  key={artist.slug}
                  aria-current={isActive ? 'true' : undefined}
                  // Card sizing: center card fills ~78vw on mobile, ~52vw on desktop, capped at 560px
                  className="
                    relative flex-shrink-0 overflow-hidden rounded-2xl edge-refract
                    w-[78vw] sm:w-[62vw] lg:w-[46vw] xl:w-[560px]
                    h-[60vh] max-h-[560px] min-h-[360px]
                  "
                  animate={
                    reduce
                      ? {}
                      : {
                          scale: isActive ? 1 : 0.9,
                          opacity: isActive ? 1 : 0.5,
                        }
                  }
                  transition={reduce ? { duration: 0 } : { ...SPRING }}
                  onClick={() => !isActive && setActiveIndex(index)}
                  style={{
                    marginRight: index < PUBLIC_ARTISTS.length - 1 ? GAP : 0,
                    cursor: isActive ? 'default' : 'pointer',
                    willChange: 'transform, opacity',
                  }}
                >
                  {/* Photo */}
                  <img
                    src={`/photos/${artist.slug}.webp`}
                    alt={artist.name}
                    loading="lazy"
                    className={`grade-portrait absolute inset-0 h-full w-full object-cover ${isActive ? 'is-active' : ''}`}
                  />

                  {/* Legibility scrim */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base via-base/30 to-transparent" />

                  {/* Active card: full content overlay */}
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
                            to={`/artist/${artist.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--accent-line)] px-5 py-2.5 font-grotesk text-sm text-ink transition-colors hover:bg-[var(--accent-soft)]"
                          >
                            View Artist
                          </Link>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Inactive card: minimal label */}
                  {!isActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                      <span className="font-display text-lg text-accent">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="font-display text-lg text-ink opacity-70">
                        {artist.name}
                      </span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* ── Controls row: arrows + dots ── */}
        <div className="mt-6 flex items-center justify-center gap-6 px-6 md:mt-8">
          {/* Prev arrow */}
          <button
            aria-label="Previous artist"
            aria-disabled={atStart}
            onClick={() => !atStart && setActiveIndex((i) => i - 1)}
            className={`
              accent-press edge-refract
              flex h-11 w-11 shrink-0 items-center justify-center rounded-full
              border border-[var(--accent-line)] transition-opacity
              ${atStart ? 'cursor-not-allowed opacity-30' : 'hover:bg-[var(--accent-soft)] opacity-100'}
            `}
          >
            <CaretLeft size={20} weight="bold" />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1" role="tablist" aria-label="Artist selector">
            {PUBLIC_ARTISTS.map((artist, index) => {
              const isDotActive = index === activeIndex
              return (
                <button
                  key={artist.slug}
                  role="tab"
                  aria-selected={isDotActive}
                  aria-label={`Go to ${artist.name}`}
                  onClick={() => setActiveIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 44,
                    minHeight: 44,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: isDotActive ? 24 : 8,
                      height: 10,
                      borderRadius: 9999,
                      backgroundColor: isDotActive ? 'var(--accent)' : 'rgba(255,255,255,0.25)',
                      transition: 'width 0.3s cubic-bezier(0.16,1,0.3,1), background-color 0.3s',
                    }}
                  />
                </button>
              )
            })}
          </div>

          {/* Next arrow */}
          <button
            aria-label="Next artist"
            aria-disabled={atEnd}
            onClick={() => !atEnd && setActiveIndex((i) => i + 1)}
            className={`
              accent-press edge-refract
              flex h-11 w-11 shrink-0 items-center justify-center rounded-full
              border border-[var(--accent-line)] transition-opacity
              ${atEnd ? 'cursor-not-allowed opacity-30' : 'hover:bg-[var(--accent-soft)] opacity-100'}
            `}
          >
            <CaretRight size={20} weight="bold" />
          </button>
        </div>
      </div>
    </section>
  )
}
