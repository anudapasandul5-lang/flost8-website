import { useScroll, useMotionValueEvent } from 'framer-motion'
import { useRef, useEffect } from 'react'
import EyebrowRule from '../ui/EyebrowRule'
import { useMotionSafe } from '../../hooks/useMotionSafe'

const PARTNERS = [
  { slug: 'corso', name: 'Corso', url: 'https://www.instagram.com/corso.lk/' },
  { slug: 'sun_crush', name: 'Sun Crush', url: 'https://www.instagram.com/suncrushbeverage/' },
  { slug: 'a_logo', name: 'Astroid SL', url: 'https://astroidsl.com/' },
  { slug: 'vibe_mount', name: 'Vibe Mount', url: 'https://www.instagram.com/vibemount_/' },
  { slug: 'pixels_n_pints', name: 'Pixels n Pints', url: 'https://www.instagram.com/pixelsnpints.cmb/' },
  { slug: 'soul_boner', name: 'Soul Boner', url: 'https://thirstyforsoulboner.com/' },
  { slug: 'abstract_mark', name: 'Address.lk', url: 'https://www.addresshop.com/' },
  { slug: 'speedbay', name: 'Speedbay', url: 'https://www.instagram.com/speedbaylk/' },
  { slug: 'reignite', name: 'Reignite', url: 'https://www.reignitee.com/' },
  { slug: 'hype_bomb', name: 'Hype Bomb', url: 'https://www.instagram.com/drinkhypebam/' },
  { slug: 'spinner_energy_drink', name: 'Spinner Energy Drink', url: 'https://www.instagram.com/spinnerenergydrink/' },
  { slug: 'traveling_bruncher', name: 'The Traveling Bruncher', url: 'https://www.instagram.com/thetravelingbruncher/' },
  { slug: 'vocaine', name: 'Vocaine', url: 'https://vocaine.com/' },
] as const

const K = 0.06 // lerp factor for reveal — small = slow ease-in on scroll-up
const SETTLE = 0.004 // snap threshold

export default function Partners() {
  const { reduce } = useMotionSafe()
  const gridRef = useRef<HTMLDivElement>(null)

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

  // Exit window: ramps 0→1 as the grid top crosses and leaves the top edge.
  // Narrow/responsive — the down-fade tracks scroll directly; scroll-up slowness
  // comes from the rAF lerp (K), not from stretching this window.
  const { scrollYProgress: exitProgress } = useScroll({
    target: gridRef,
    offset: ['start 0.15', 'start -0.15'],
  })

  // tick: called each animation frame while running.
  // Lerps displayed toward targets (slow on reveal, instant on hide).
  const tick = () => {
    const grid = gridRef.current
    if (!grid) {
      running.current = false
      return
    }
    const tiles = grid.querySelectorAll<HTMLElement>('.partner-tile')
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
    const grid = gridRef.current
    if (!grid) return
    const p = scrollYProgress.get()
    const exit = Math.min(Math.max(exitProgress.get(), 0), 1)
    const tiles = grid.querySelectorAll<HTMLElement>('.partner-tile')
    const c = (tiles.length - 1) / 2

    const isFirstRun = displayed.current.length !== tiles.length

    tiles.forEach((tile, i) => {
      const distNorm = c === 0 ? 0 : Math.abs(i - c) / c // 0 center -> 1 edge
      const start = distNorm * 0.6 // edges start later
      const local = Math.min(Math.max((p - start) / 0.4, 0), 1)
      const e = 1 - Math.pow(1 - local, 3) // easeOutCubic
      // Exit ripples center-out too (mirror of entry), so scrolling up re-reveals center-out.
      const exitLocal = Math.min(Math.max((exit - start) / 0.4, 0), 1)
      // On mobile the grid wraps into several tall rows; fading tiles out on exit leaves
      // a large empty void before the next section. Keep tiles visible on mobile —
      // only desktop (one short row) does the center-out exit fade.
      const eo = window.innerWidth < 768 ? 0 : 1 - Math.pow(1 - exitLocal, 3) // easeOutCubic
      const target = e * (1 - eo)
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

  useMotionValueEvent(exitProgress, 'change', () => {
    if (reduce) return
    paint()
  })

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
    <section className="relative bg-base py-8 md:py-14">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
          Trusted by venues &amp; brands
        </p>
        <EyebrowRule />

        <span className="sr-only">{PARTNERS.map((p) => p.name).join(', ')}</span>

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
                className="group partner-tile relative aspect-square w-20 overflow-hidden rounded-full bg-base-raise outline outline-1 outline-offset-0 outline-transparent transition-[box-shadow,outline-color] duration-[450ms] will-change-transform hover:shadow-[0_0_26px_rgba(157,20,255,0.45)] hover:outline-accent/60 sm:w-24 md:w-28"
                style={{ opacity: reduce ? 1 : 0 }}
              >
                <img
                  src={`/logos/color/${p.slug}.jpg`}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover opacity-55 grayscale transition-all duration-[750ms] will-change-transform group-hover:scale-[1.05] group-hover:opacity-100 group-hover:grayscale-0"
                />
              </Wrapper>
            )
          })}
        </div>
      </div>
    </section>
  )
}
