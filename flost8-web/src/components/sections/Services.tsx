import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'
import { SERVICES } from '../../lib/config'
import { EASE } from '../../lib/motion'
import RevealLines from '../ui/RevealLines'
import EyebrowRule from '../ui/EyebrowRule'
import { useMotionSafe } from '../../hooks/useMotionSafe'

// Scene image per service (index-matched to SERVICES).
// The slot is a ~square panel on desktop but a short wide band on mobile, so each photo ships
// two crops and the browser fetches only the one its media query matches. Panels are square on
// purpose: the desktop slot's aspect swings with viewport height, and a square crops gently at
// every ratio it lands on.
type ServiceImage = { panel: string; band: string }
const SERVICE_IMAGES: ServiceImage[] = [
  {
    panel: '/ui2/gen/what-we-do-artist-development.webp',
    band: '/ui2/gen/what-we-do-artist-development-band.webp',
  },
  {
    panel: '/ui2/gen/what-we-do-booking-system.webp',
    band: '/ui2/gen/what-we-do-booking-system-band.webp',
  },
  {
    panel: '/ui2/gen/what-we-do-content-engine.webp',
    band: '/ui2/gen/what-we-do-content-engine-band.webp',
  },
]
type Service = (typeof SERVICES)[number]

/** Card visual — image on top (mobile) / to the side (desktop); fixed height for the stack. */
function CardInner({ service, image }: { service: Service; image: ServiceImage }) {
  return (
    <div className="relative mx-auto flex h-[44vh] w-full max-w-[960px] flex-col overflow-hidden rounded-[1.5rem] bg-base-raise edge-refract shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] md:h-[46vh] md:flex-row md:rounded-[1.75rem]">
      {/* image: top band on mobile, right side on desktop */}
      <div className="relative h-28 w-full shrink-0 overflow-hidden md:order-last md:h-full md:w-[40%]">
        <picture>
          <source media="(min-width: 768px)" srcSet={image.panel} />
          <img
            src={image.band}
            alt=""
            aria-hidden="true"
            width={1100}
            height={314}
            // Small webp — load eagerly (low priority) so pixels are ready
            // before the card scrolls in; the card's fade then carries the image
            // smoothly instead of it popping in after the card is already visible.
            loading="eager"
            fetchPriority="low"
            decoding="async"
            className="grade-portrait h-full w-full object-cover"
          />
        </picture>
      </div>
      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-6 md:px-10 md:py-8">
        <span className="mb-2 font-display text-4xl leading-none text-accent md:mb-3 md:text-7xl">
          {service.no}
        </span>
        <h3 className="mb-3 font-display text-2xl leading-[0.95] text-ink md:mb-4 md:text-5xl">
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

function StartLink() {
  return (
    <Link
      to="/bookings"
      className="inline-flex min-h-[44px] items-center font-grotesk text-[1rem] text-accent-ink transition-colors hover:text-accent md:text-lg"
    >
      Start a project
      <ArrowRight size={20} weight="bold" className="ml-2" />
    </Link>
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
        <div className="mt-8">
          <StartLink />
        </div>
      </div>
    </section>
  )
}
