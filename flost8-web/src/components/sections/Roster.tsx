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
  // Seed from the last-viewed card so returning from an artist page lands on it.
  const [activeIndex, setActiveIndex] = useState(() => {
    const saved = Number(sessionStorage.getItem('roster:index'))
    return Number.isFinite(saved) ? Math.min(Math.max(0, saved), PUBLIC_ARTISTS.length - 1) : 0
  })
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  // Card step in px (card width + gap), measured after layout
  const [cardStep, setCardStep] = useState(0)
  // Centering offset so the active card sits centered
  const [centerOffset, setCenterOffset] = useState(0)
  // Viewport width (for end-anchoring so no dead space past first/last card)
  const [viewportW, setViewportW] = useState(0)

  // Mobile mode: native scroll-snap vs desktop peek/drag. Seeded synchronously
  // from matchMedia so first paint is correct — deriving it from the async-
  // measured viewportW (starts at 0) rendered the desktop carousel on mobile.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // rAF handle: throttle the mobile scroll → activeIndex sync to one update per frame
  const scrollRaf = useRef<number | undefined>(undefined)
  // Lock card taps while the track is settling so a double-click doesn't activate a
  // second card that slid under the cursor mid-animation.
  const settling = useRef(false)

  // Framer motion x value for the track
  const x = useMotionValue(0)

  // ── Measure card dimensions after layout and on resize ──────────────────────
  const measure = useCallback(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return
    const firstCard = track.firstElementChild as HTMLElement | null
    if (!firstCard) return
    const cardW = firstCard.offsetWidth
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

  // Cancel any pending scroll-sync frame on unmount
  useEffect(
    () => () => {
      if (scrollRaf.current !== undefined) window.cancelAnimationFrame(scrollRaf.current)
    },
    [],
  )

  // Persist the active card so it survives navigating away + back.
  useEffect(() => {
    sessionStorage.setItem('roster:index', String(activeIndex))
  }, [activeIndex])

  // Restore the mobile scroll position to the seeded card once measured (once).
  // Desktop restores via the x-sync effect below. Runs before any user scroll.
  const didRestore = useRef(false)
  useLayoutEffect(() => {
    if (didRestore.current || cardStep === 0) return
    didRestore.current = true
    if (isMobile && activeIndex > 0 && viewportRef.current) {
      viewportRef.current.scrollLeft = activeIndex * cardStep
    }
  }, [cardStep, isMobile, activeIndex])

  // ── Resting track-x for a given card index (centered, with end anchoring) ────
  const getTargetX = useCallback(
    (index: number) => {
      // Edge inset so the first/last card sits a touch off the viewport edge,
      // roughly aligned with the section's horizontal padding.
      const PAD = viewportW >= 768 ? 40 : viewportW >= 640 ? 24 : 0
      const trackW = PUBLIC_ARTISTS.length * cardStep - GAP
      const raw = centerOffset - index * cardStep
      // Anchor the ends: never reveal dead space left of the first card or
      // right of the last. Middle cards still center normally.
      const maxX = PAD
      const minX = Math.min(PAD, viewportW - PAD - trackW)
      return Math.max(minX, Math.min(maxX, raw))
    },
    [viewportW, cardStep, centerOffset],
  )

  // ── Sync x to activeIndex (programmatic: arrows / dots / keyboard) ───────────
  const firstSync = useRef(true)
  useEffect(() => {
    if (cardStep === 0) return
    if (isMobile) return
    const targetX = getTargetX(activeIndex)
    // First run (mount / restore from a back-nav) jumps instantly so the seeded card
    // is just there — no slide-into-place. Later index changes animate normally.
    if (reduce || firstSync.current) {
      x.set(targetX)
      firstSync.current = false
    } else {
      animate(x, targetX, { ...SPRING })
    }
  }, [activeIndex, cardStep, centerOffset, viewportW, isMobile, reduce, x, getTargetX])


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

  // ── Drag snap: one card per swipe, always re-snap to the resting position ────
  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (cardStep === 0) return
      // One card per swipe: advance ±1 if dragged past ~20% of a card OR flicked
      // decisively, else snap back. Always animate to the resting position so the
      // track never parks off-grid (the sync effect won't fire if the index is unchanged).
      const last = PUBLIC_ARTISTS.length - 1
      const distance = cardStep * 0.2
      const flick = 500 // px/s
      const { offset, velocity } = info
      let next = activeIndex
      if (offset.x < -distance || velocity.x < -flick) {
        next = Math.min(last, activeIndex + 1)
      } else if (offset.x > distance || velocity.x > flick) {
        next = Math.max(0, activeIndex - 1)
      }
      setActiveIndex(next)
      if (reduce) {
        x.set(getTargetX(next))
      } else {
        animate(x, getTargetX(next), { ...SPRING })
      }
    },
    [activeIndex, cardStep, x, reduce, getTargetX],
  )

  const atStart = activeIndex === 0
  const atEnd = activeIndex === PUBLIC_ARTISTS.length - 1

  return (
    <section id="roster" className="relative bg-base py-10 md:py-20">
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
          We build the people, the sound, and the rooms they take over, not a roster we rent out by the hour.
        </p>
      </div>

      {/* ── Carousel region ── */}
      {/* Capped to the header's own max-w-[1400px] so the carousel's own PAD inset
          (meant to roughly match the header's px-6/10) lines up with it on wide
          viewports too - without this the region bled edge-to-edge past 1400px+padding
          while the header text above stayed centered, so card 01 sat further left
          than "THE ROSTER" heading. */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Artist roster"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="mx-auto mt-12 max-w-[1400px] outline-none md:mt-16 rounded-2xl focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-[#120917]"
      >
        {/* Viewport: clips the overflowing track (desktop) / native scroll container (mobile) */}
        <div
          ref={viewportRef}
          className={`relative ${
            isMobile
              ? `overflow-x-auto snap-x snap-mandatory no-scrollbar overscroll-x-contain ${reduce ? '' : 'scroll-smooth'}`
              : 'overflow-hidden'
          }`}
          style={isMobile ? undefined : { cursor: reduce ? 'default' : 'grab' }}
          onScroll={() => {
            if (!isMobile || cardStep === 0) return
            // Sync activeIndex LIVE (rAF-throttled) so the bottom dot tracks the
            // swipe instead of jumping at settle. Safe on mobile: card content is
            // identical regardless of activeIndex (showFull = isActive || isMobile,
            // scale/opacity constant), so this only toggles aria-current + the dot —
            // it does not re-render card internals, so native momentum is preserved.
            if (scrollRaf.current !== undefined) return
            scrollRaf.current = window.requestAnimationFrame(() => {
              scrollRaf.current = undefined
              const el = viewportRef.current
              if (!el) return
              const raw = Math.round(el.scrollLeft / cardStep)
              const idx = Math.max(0, Math.min(PUBLIC_ARTISTS.length - 1, raw))
              setActiveIndex((prev) => (prev !== idx ? idx : prev))
            })
          }}
        >
          {/* Track */}
          <motion.div
            ref={trackRef}
            drag={!isMobile && !reduce ? 'x' : false}
            dragConstraints={viewportRef}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            dragMomentum={false}
            // will-change only on desktop, where the track is transform-animated.
            // On mobile the native scroller moves scrollLeft (not x), so a permanent
            // compositor layer here is pure waste and hurts FPS.
            style={{ x, willChange: isMobile ? 'auto' : 'transform', touchAction: isMobile ? 'manipulation' : 'pan-y' }}
            className="flex"
            // gap via inline style so the JS gap constant matches
          >
            {PUBLIC_ARTISTS.map((artist, index) => {
              const isActive = index === activeIndex
              // On mobile every full-bleed card shows the full overlay — the
              // active index lags scroll (debounced), so keying content off it
              // would flash the minimal label mid-swipe.
              const showFull = isActive || isMobile

              return (
                <motion.div
                  key={artist.slug}
                  aria-current={isActive ? 'true' : undefined}
                  // Card sizing: full-bleed (container width) on mobile, peek layout on desktop
                  // snap-center activates inside the mobile snap container; harmless on desktop
                  className="
                    relative flex-shrink-0 overflow-hidden rounded-none sm:rounded-2xl edge-refract photo-treat snap-center
                    w-full sm:w-[62vw] lg:w-[46vw] xl:w-[560px]
                    aspect-[3/4] sm:aspect-square
                  "
                  animate={
                    reduce
                      ? {}
                      : {
                          scale: isActive || isMobile ? 1 : 0.9,
                          opacity: isActive || isMobile ? 1 : 0.5,
                        }
                  }
                  transition={reduce ? { duration: 0 } : { ...SPRING }}
                  onClick={() => {
                    if (isActive || settling.current) return
                    settling.current = true
                    window.setTimeout(() => { settling.current = false }, 450)
                    setActiveIndex(index)
                  }}
                  style={{
                    marginRight: index < PUBLIC_ARTISTS.length - 1 ? GAP : 0,
                    cursor: isActive ? 'default' : 'pointer',
                    // ponytail: no permanent will-change — every full-screen card
                    // holding its own compositor layer is what caused the mobile
                    // stutter. Framer promotes the card itself while it animates (desktop).
                  }}
                >
                  {/* Photo */}
                  <img
                    src={`/photos/${artist.slug}.webp`}
                    alt={artist.name}
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: artist.focal ?? 'center' }}
                    className={`grade-portrait absolute inset-0 h-full w-full object-cover ${isActive || isMobile ? 'is-active' : ''}`}
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = 'none';
                      const card = el.closest('.photo-treat') as HTMLElement | null;
                      if (card) card.style.backgroundColor = '#1B0F24';
                    }}
                  />

                  {/* Legibility scrim */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base via-base/30 to-transparent" />

                  {/* Active card: full content overlay */}
                  {showFull && (
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
                            to={`/artist/${artist.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--accent-line)] px-5 py-2.5 font-grotesk text-sm text-ink transition-colors hover:bg-[var(--accent-soft)]"
                          >
                            View Artist
                          </Link>
                          <Link
                            to={`/bookings?artist=${artist.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="accent-press edge-refract inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-grotesk text-sm text-ink"
                          >
                            Book Now
                          </Link>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Inactive card: minimal label */}
                  {!showFull && (
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
          {/* Prev arrow — hidden on mobile, shown ≥sm */}
          <button
            type="button"
            aria-label="Previous artist"
            aria-disabled={atStart}
            onClick={() => !atStart && setActiveIndex((i) => i - 1)}
            className={`
              accent-press edge-refract
              hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-full
              border border-[var(--accent-line)] transition-opacity
              ${atStart ? 'cursor-not-allowed opacity-30' : 'hover:bg-[var(--accent-soft)] opacity-100'}
            `}
          >
            <CaretLeft size={20} weight="bold" />
          </button>

          {/* Dot indicators — plain buttons (not a tablist: no tabpanels to control) */}
          <div className="flex items-center gap-1" aria-label="Artist selector">
            {PUBLIC_ARTISTS.map((artist, index) => {
              const isDotActive = index === activeIndex
              return (
                <button
                  key={artist.slug}
                  type="button"
                  aria-label={`Go to ${artist.name}`}
                  aria-current={isDotActive ? 'true' : undefined}
                  onClick={() => {
                    if (isMobile) {
                      setActiveIndex(index)
                      viewportRef.current?.scrollTo({ left: index * cardStep, behavior: reduce ? 'auto' : 'smooth' })
                    } else {
                      setActiveIndex(index)
                    }
                  }}
                  className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#120917]"
                >
                  <span
                    className={`block h-[10px] rounded-full transition-[width,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isDotActive ? 'w-6 bg-accent' : 'w-2 bg-white/25'
                    }`}
                  />
                </button>
              )
            })}
          </div>

          {/* Next arrow — hidden on mobile, shown ≥sm */}
          <button
            type="button"
            aria-label="Next artist"
            aria-disabled={atEnd}
            onClick={() => !atEnd && setActiveIndex((i) => i + 1)}
            className={`
              accent-press edge-refract
              hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-full
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
