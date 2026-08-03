import { motion } from 'framer-motion'
import { SERVICES } from '../../lib/config'
import { EASE } from '../../lib/motion'
import RevealLines from '../ui/RevealLines'
import EyebrowRule from '../ui/EyebrowRule'
import { useMotionSafe } from '../../hooks/useMotionSafe'

// Scene image per service (index-matched to SERVICES). The dedicated mobile "band" crops
// were bad too-tight closeups on some of these — the panel shot is well-composed at ~4:5
// and used everywhere now (tall aspect on mobile, square-ish side panel on desktop).
type ServiceImage = { panel: string; desktopZoom?: boolean }
const SERVICE_IMAGES: ServiceImage[] = [
  { panel: '/ui2/gen/what-we-do-artist-development.webp' },
  { panel: '/ui2/gen/what-we-do-booking-system.webp' },
  { panel: '/ui2/gen/what-we-do-content-engine.webp', desktopZoom: true },
]
type Service = (typeof SERVICES)[number]

/** Mobile: editorial treatment — tall portrait image with the index + title overlaid on a
 *  bottom scrim, body copy below. Desktop (md+): the original boxed side-by-side card. */
function CardInner({ service, image }: { service: Service; image: ServiceImage }) {
  return (
    <div className="relative mx-auto flex w-full max-w-[960px] flex-col md:h-[46vh] md:flex-row md:overflow-hidden md:rounded-[1.75rem] md:bg-base-raise md:edge-refract md:shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]">
      <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-2xl md:order-last md:aspect-auto md:h-full md:w-[40%] md:rounded-none">
        <img
          src={image.panel}
          alt=""
          aria-hidden="true"
          width={874}
          height={760}
          loading="eager"
          fetchPriority="low"
          decoding="async"
          className={`grade-portrait h-full w-full object-cover${image.desktopZoom ? ' md:scale-[1.25]' : ''}`}
        />
        {/* Scrim + overlaid index/title: mobile only, so the desktop side-panel stays a clean photo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-base via-base/70 to-transparent md:hidden"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 md:hidden">
          <span className="font-display text-6xl leading-[0.8] text-accent">{service.no}</span>
          <h3 className="pb-1 font-display text-3xl leading-[0.9] text-ink">{service.title}</h3>
        </div>
      </div>

      {/* Desktop copy block — index + title repeat here; mobile shows them over the image instead. */}
      <div className="relative z-10 flex flex-1 flex-col justify-center pt-4 md:px-10 md:py-8 md:pt-0">
        <span className="mb-3 hidden font-display leading-none text-accent md:block md:text-7xl">
          {service.no}
        </span>
        <h3 className="mb-4 hidden font-display leading-[0.95] text-ink md:block md:text-5xl">
          {service.title}
        </h3>
        <p className="max-w-[52ch] font-grotesk text-[0.95rem] text-[var(--ink-72)] md:text-[1rem]">
          {service.line}
        </p>
      </div>
    </div>
  )
}

function Header() {
  return (
    <div className="shrink-0">
      <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
        Three ways we work
      </p>
      <EyebrowRule />
      <RevealLines
        lines={['WHAT WE DO']}
        className="mt-3 font-display text-4xl leading-[0.9] text-ink sm:text-5xl md:text-7xl"
      />
    </div>
  )
}

/** Plain vertical stack — cards fade up as they enter view. No pinning, no scroll-jack. */
function StackedCards({ animate }: { animate: boolean }) {
  return (
    <div className="mt-10 flex flex-col gap-5">
      {SERVICES.map((service, i) => (
        <motion.div
          key={service.no}
          initial={animate ? { opacity: 0, y: 14 } : false}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          <CardInner service={service} image={SERVICE_IMAGES[i]} />
        </motion.div>
      ))}
    </div>
  )
}

export default function Services() {
  const { reduce } = useMotionSafe()

  // Plain stacked cards, header in normal flow — no pinning / scroll-jack.
  return (
    <section id="about" className="relative bg-base">
      <div className="mx-auto max-w-[1400px] px-6 pb-6 pt-14 md:px-10 md:pt-20">
        <Header />
        <StackedCards animate={!reduce} />
      </div>
    </section>
  )
}
