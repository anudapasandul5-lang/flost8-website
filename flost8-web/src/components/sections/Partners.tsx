import { useReducedMotion, useScroll, useMotionValueEvent } from 'framer-motion'
import { useRef, useEffect } from 'react'
import EyebrowRule from '../ui/EyebrowRule'

const PARTNERS = [
  { slug: 'corso', name: 'Corso' },
  { slug: 'sun_crush', name: 'Sun Crush' },
  { slug: 'spinner_energy_drink', name: 'Spinner Energy Drink' },
  { slug: 'vibe_mount', name: 'Vibe Mount' },
  { slug: 'pixels_n_pints', name: 'Pixels n Pints' },
  { slug: 'soul_boner', name: 'Soul Boner' },
  { slug: 'abstract_mark', name: 'Apex' },
  { slug: 'speedbay', name: 'Speedbay' },
  { slug: 'reignite', name: 'Reignite' },
  { slug: 'hype_bomb', name: 'Hype Bomb' },
  { slug: 'a_logo', name: 'Ascent' },
  { slug: 'vocaine', name: 'Vocaine' },
  { slug: 'traveling_bruncher', name: 'The Traveling Bruncher' },
] as const

// Logos that are a circle on a solid square — clip the tile to a circle so the
// leftover square corners (white/black) don't show on the dark page.
const CIRCLE_LOGOS = new Set(['spinner_energy_drink', 'traveling_bruncher'])

export default function Partners() {
  const shouldReduce = useReducedMotion()
  const gridRef = useRef<HTMLDivElement>(null)

  // Reveal is scrubbed by scroll position: as the grid scrolls up through the
  // viewport, tiles fade+scale in center-out, matched to scrollYProgress.
  const { scrollYProgress } = useScroll({
    target: gridRef,
    offset: ['start 0.9', 'start 0.4'],
  })

  // Paint each tile from a 0..1 scroll progress, center-out.
  const paint = (p: number) => {
    const grid = gridRef.current
    if (!grid) return
    const tiles = grid.querySelectorAll<HTMLElement>('.partner-tile')
    const c = (tiles.length - 1) / 2
    tiles.forEach((tile, i) => {
      const distNorm = c === 0 ? 0 : Math.abs(i - c) / c // 0 center -> 1 edge
      const start = distNorm * 0.6 // edges start later
      const local = Math.min(Math.max((p - start) / 0.4, 0), 1)
      const e = 1 - Math.pow(1 - local, 3) // easeOutCubic
      tile.style.opacity = String(e)
      tile.style.transform = `scale(${0.6 + 0.4 * e})`
    })
  }

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (shouldReduce) return
    paint(p)
  })

  useEffect(() => {
    if (shouldReduce) return
    paint(scrollYProgress.get()) // set initial state (handles mid-page loads)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReduce])

  return (
    <section className="relative bg-base py-8 md:py-14">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
          Trusted by venues &amp; brands
        </p>
        <EyebrowRule />

        <span className="sr-only">{PARTNERS.map((p) => p.name).join(', ')}</span>

        <div ref={gridRef} className="mt-10 flex flex-wrap justify-center gap-4 md:mt-12 md:gap-6">
          {PARTNERS.map((p) => {
            const circle = CIRCLE_LOGOS.has(p.slug)
            return (
              <div
                key={p.slug}
                className={`group partner-tile relative aspect-square w-20 overflow-hidden bg-base-raise transition-shadow duration-[450ms] will-change-transform hover:shadow-[0_0_26px_rgba(157,20,255,0.45)] sm:w-24 md:w-28 ${circle ? 'rounded-full' : 'rounded-xl'}`}
                style={{ opacity: shouldReduce ? 1 : 0 }}
              >
                <img
                  src={`/logos/color/${p.slug}.jpg`}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover opacity-55 grayscale transition-all duration-[750ms] will-change-transform group-hover:scale-[1.05] group-hover:opacity-100 group-hover:grayscale-0"
                />
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/0 transition-colors duration-[450ms] group-hover:ring-accent/40 ${circle ? 'rounded-full' : 'rounded-xl'}`}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
