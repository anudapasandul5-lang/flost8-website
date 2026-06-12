import { useReducedMotion, useScroll, useMotionValueEvent } from 'framer-motion'
import { useRef, useEffect } from 'react'
import EyebrowRule from '../ui/EyebrowRule'

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

export default function Partners() {
  const shouldReduce = useReducedMotion()
  const gridRef = useRef<HTMLDivElement>(null)

  // Reveal is scrubbed by scroll position: as the grid scrolls up through the
  // viewport, tiles fade+scale in center-out, matched to scrollYProgress.
  const { scrollYProgress } = useScroll({
    target: gridRef,
    offset: ['start 0.9', 'start 0.4'],
  })

  // Exit window: ramps 0→1 as the grid top crosses and leaves the top edge.
  const { scrollYProgress: exitProgress } = useScroll({
    target: gridRef,
    offset: ['start 0.15', 'start -0.15'],
  })

  // Paint each tile — reads both entry and exit progress, no argument.
  const paint = () => {
    const grid = gridRef.current
    if (!grid) return
    const p = scrollYProgress.get()
    const exit = Math.min(Math.max(exitProgress.get(), 0), 1)
    const tiles = grid.querySelectorAll<HTMLElement>('.partner-tile')
    const c = (tiles.length - 1) / 2
    tiles.forEach((tile, i) => {
      const distNorm = c === 0 ? 0 : Math.abs(i - c) / c // 0 center -> 1 edge
      const start = distNorm * 0.6 // edges start later
      const local = Math.min(Math.max((p - start) / 0.4, 0), 1)
      const e = 1 - Math.pow(1 - local, 3) // easeOutCubic
      // Exit ripples center-out too (mirror of entry), so scrolling up re-reveals center-out.
      const exitLocal = Math.min(Math.max((exit - start) / 0.4, 0), 1)
      const eo = 1 - Math.pow(1 - exitLocal, 3) // easeOutCubic
      tile.style.opacity = String(e * (1 - eo))
      tile.style.transform = `scale(${0.6 + 0.4 * e})`
    })
  }

  useMotionValueEvent(scrollYProgress, 'change', () => {
    if (shouldReduce) return
    paint()
  })

  useMotionValueEvent(exitProgress, 'change', () => {
    if (shouldReduce) return
    paint()
  })

  useEffect(() => {
    if (shouldReduce) return
    paint() // set initial state (handles mid-page loads)
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
                style={{ opacity: shouldReduce ? 1 : 0 }}
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
