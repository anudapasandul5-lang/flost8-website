import { useScroll, useMotionValueEvent } from 'framer-motion'
import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import EyebrowRule from '../ui/EyebrowRule'
import { PARTNERS } from '../../lib/config'
import { useMotionSafe } from '../../hooks/useMotionSafe'

const K = 0.06 // lerp factor for reveal — small = slow ease-in on scroll-up
const SETTLE = 0.004 // snap threshold

export default function Partners() {
  const { reduce } = useMotionSafe()
  const gridRef = useRef<HTMLDivElement>(null)
  // Tile list — cached once on mount. PARTNERS is a static import so the tile
  // count never changes; re-querying the DOM every rAF frame was pure waste.
  const tilesRef = useRef<HTMLElement[]>([])

  // Per-tile smoothed opacity (what's actually written to the DOM).
  const displayed = useRef<number[]>([])
  // Per-tile target opacity (raw scroll-computed value).
  const targets = useRef<number[]>([])
  const rafId = useRef(0)
  const running = useRef(false)

  // Reveal is scrubbed by scroll position: as the grid scrolls up through the
  // viewport, tiles fade+scale in center-out, matched to scrollYProgress.
  const { scrollYProgress } = useScroll({
    target: gridRef,
    offset: ['start 0.9', 'start 0.4'],
  })

  // Drives repaints throughout the section's exit so each tile can fade by its OWN
  // viewport position (smooth top-down fade-out, no empty void on tall mobile grids).
  const { scrollYProgress: leaveProgress } = useScroll({
    target: gridRef,
    offset: ['start 0.5', 'end start'],
  })

  // tick: called each animation frame while running.
  // Lerps displayed toward targets (slow on reveal, instant on hide).
  const tick = () => {
    const tiles = tilesRef.current
    if (tiles.length === 0) {
      running.current = false
      return
    }
    let settled = true
    tiles.forEach((tile, i) => {
      const target = targets.current[i] ?? 0
      let disp = displayed.current[i] ?? target
      if (target >= disp) {
        // Revealing — ease slowly
        disp += (target - disp) * K
        if (Math.abs(target - disp) < SETTLE) disp = target
        else settled = false
      } else {
        // Hiding — instant
        disp = target
      }
      displayed.current[i] = disp
      tile.style.opacity = String(disp)
    })
    if (settled) {
      running.current = false
    } else {
      rafId.current = requestAnimationFrame(tick)
    }
  }

  const ensureLoop = () => {
    if (running.current) return
    running.current = true
    rafId.current = requestAnimationFrame(tick)
  }

  // Paint: computes targets[] + scale, then kicks off the rAF loop.
  const paint = () => {
    const tiles = tilesRef.current
    if (tiles.length === 0) return
    const p = scrollYProgress.get()
    const vh = window.innerHeight || 1
    const c = (tiles.length - 1) / 2

    const isFirstRun = displayed.current.length !== tiles.length

    tiles.forEach((tile, i) => {
      const distNorm = c === 0 ? 0 : Math.abs(i - c) / c // 0 center -> 1 edge
      const start = distNorm * 0.6 // edges start later
      const local = Math.min(Math.max((p - start) / 0.4, 0), 1)
      const e = 1 - Math.pow(1 - local, 3) // easeOutCubic (reveal-in, center-out)
      // Exit: each tile fades by its own viewport position as it scrolls off the top,
      // so the grid empties top-down — no faded-but-space-occupying void (tall mobile grids).
      const rect = tile.getBoundingClientRect()
      const center = rect.top + rect.height / 2
      const fadeEnd = vh * -0.05 // fully gone once center is 5% above the top edge
      const fadeStart = vh * 0.08 // begins fading only when center is within top 8% of viewport
      const exitVis = Math.min(Math.max((center - fadeEnd) / (fadeStart - fadeEnd), 0), 1)
      const target = Math.min(e, exitVis)
      targets.current[i] = target
      // Scale is entry-only, written directly (not eased).
      tile.style.transform = `scale(${0.6 + 0.4 * e})`

      if (isFirstRun) {
        // Initialize displayed to target immediately — no flash-in on mount/refresh.
        displayed.current[i] = target
        tile.style.opacity = String(target)
      }
    })

    if (!isFirstRun) {
      ensureLoop()
    }
  }

  useMotionValueEvent(scrollYProgress, 'change', () => {
    if (reduce) return
    paint()
  })

  useMotionValueEvent(leaveProgress, 'change', () => {
    if (reduce) return
    paint()
  })

  useEffect(() => {
    const grid = gridRef.current
    if (grid) {
      tilesRef.current = Array.from(grid.querySelectorAll<HTMLElement>('.partner-tile'))
    }
  }, [])

  useEffect(() => {
    if (reduce) return
    paint() // set initial state (handles mid-page loads, initializes displayed[])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce])

  // Cleanup: cancel rAF on unmount.
  useEffect(() => {
    return () => cancelAnimationFrame(rafId.current)
  }, [])

  return (
    <section id="brands" className="relative bg-base py-8 md:py-14">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
          Trusted by venues &amp; brands
        </p>
        <EyebrowRule />

        <div ref={gridRef} className="relative mt-10 flex flex-wrap justify-center gap-4 md:mt-12 md:gap-6">
          {PARTNERS.map((p) => {
            const Wrapper = p.url ? 'a' : 'div'
            const wrapperProps = p.url
              ? {
                  href: p.url,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  'aria-label': `${p.name} (opens in new tab)`,
                }
              : {}
            return (
              <Wrapper
                key={p.slug}
                {...wrapperProps}
                className="group partner-tile relative aspect-square w-20 overflow-hidden rounded-full bg-base-raise outline outline-1 outline-offset-0 outline-transparent transition-[box-shadow,outline-color] duration-100 will-change-transform hover:shadow-[0_0_26px_rgba(157,20,255,0.45)] hover:outline-accent/60 sm:w-24 md:w-28"
                style={{ opacity: reduce ? 1 : 0 }}
              >
                <img
                  src={`/logos/color/${p.slug}.jpg`}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-all duration-100 will-change-transform group-hover:scale-[1.05]"
                />
              </Wrapper>
            )
          })}
        </div>

        <div className="mt-10 flex justify-center md:mt-12">
          <Link
            to="/partner"
            className="accent-press inline-flex min-h-[52px] items-center justify-center rounded-full border border-[var(--accent-line)] bg-transparent px-6 py-3.5 font-grotesk text-ink transition-colors duration-[450ms] hover:bg-[var(--accent-soft)]"
          >
            Collaborate With Us
          </Link>
        </div>
      </div>
    </section>
  )
}
