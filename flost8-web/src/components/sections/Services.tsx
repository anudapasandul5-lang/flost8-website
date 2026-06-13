import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'
import { SERVICES } from '../../lib/config'
import RevealLines from '../ui/RevealLines'
import { useMotionSafe } from '../../hooks/useMotionSafe'

// Scene image per service (index-matched to SERVICES)
const SERVICE_IMAGES = ['/ui2/gen/djbooth.jpg', '/ui2/gen/street.jpg', '/ui2/gen/studio.jpg']
const TOTAL = SERVICES.length

type Service = (typeof SERVICES)[number]

/** The card visual — shared by the animated and reduced-motion paths. */
function CardInner({ service, image }: { service: Service; image: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[1100px] overflow-hidden rounded-[2rem] bg-base-raise edge-refract h-[56vh] md:h-[58vh] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]">
      <div className="relative z-10 flex h-full flex-col md:flex-row">
        <div className="flex flex-1 flex-col justify-center px-8 py-8 md:px-12 md:py-12">
          <span className="mb-3 font-display text-6xl leading-none text-accent md:text-8xl">
            {service.no}
          </span>
          <h3 className="mb-4 font-display text-4xl leading-[0.95] text-ink md:text-6xl">
            {service.title}
          </h3>
          <p className="max-w-[52ch] font-grotesk text-[1rem] text-[var(--ink-72)] md:text-lg">
            {service.line}
          </p>
        </div>
        <div className="relative overflow-hidden md:w-[42%]">
          <img
            src={image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="grade-portrait h-40 w-full object-cover md:h-full"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * One card in the pinned stage. Enters from the bottom as scroll progress crosses
 * its segment, then stays — earlier cards scale down a touch so they peek behind
 * (a true stack, not a swap). Cards never travel above the stage, so they are never
 * clipped by the pinned header.
 */
function StackCard({
  service,
  image,
  index,
  progress,
}: {
  service: Service
  image: string
  index: number
  progress: MotionValue<number>
}) {
  const seg = 1 / TOTAL
  const enterAt = index * seg
  // first card is already in place; later cards slide up from below
  const y = useTransform(
    progress,
    [Math.max(0, enterAt - seg), enterAt],
    index === 0 ? ['0%', '0%'] : ['115%', '0%'],
  )
  // shrink + lift slightly once the NEXT card begins covering this one
  const isLast = index === TOTAL - 1
  const scale = useTransform(progress, [enterAt, isLast ? 1 : enterAt + seg], [1, isLast ? 1 : 0.92])
  const lift = useTransform(progress, [enterAt, isLast ? 1 : enterAt + seg], ['0%', isLast ? '0%' : '-7%'])
  // soft fade-in as a later card rises (first card always visible)
  const opacity = useTransform(
    progress,
    [Math.max(0, enterAt - seg * 0.8), Math.max(0, enterAt - seg * 0.35)],
    index === 0 ? [1, 1] : [0, 1],
  )

  return (
    <motion.div
      style={{ y, opacity, zIndex: index }}
      className="absolute inset-x-0 top-0"
    >
      <motion.div style={{ scale, y: lift, willChange: 'transform' }} className="origin-top">
        <CardInner service={service} image={image} />
      </motion.div>
    </motion.div>
  )
}

function Header() {
  return (
    <div className="shrink-0">
      <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
        Three ways we work
      </p>
      <RevealLines
        lines={['WHAT WE DO']}
        className="mt-4 font-display text-5xl leading-[0.9] text-ink md:text-7xl"
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

export default function Services() {
  const { reduce } = useMotionSafe()
  const trackRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })
  // Spring-smooth the scrub so card motion glides instead of tracking scroll 1:1.
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.0005,
  })

  if (reduce) {
    // Plain vertical stack — header in normal flow, cards static.
    return (
      <section id="about" className="relative bg-base pt-14 pb-6 md:pt-20">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <Header />
          <div className="mt-10 flex flex-col gap-6">
            {SERVICES.map((service, i) => (
              <CardInner key={service.no} service={service} image={SERVICE_IMAGES[i]} />
            ))}
          </div>
          <div className="mt-8">
            <StartLink />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="about" className="relative bg-base">
      {/* tall scroll track drives the pinned stage */}
      <div ref={trackRef} className="relative h-[340vh]">
        <div className="sticky top-0 h-[100dvh] overflow-hidden">
          <div className="mx-auto flex h-full max-w-[1400px] flex-col px-6 pt-24 pb-10 md:px-10 md:pt-28">
            <Header />
            {/* card stage — cards stack here, below the pinned header */}
            <div className="relative mt-8 min-h-0 flex-1 md:mt-12">
              {SERVICES.map((service, i) => (
                <StackCard
                  key={service.no}
                  service={service}
                  image={SERVICE_IMAGES[i]}
                  index={i}
                  progress={smoothProgress}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-6 pb-6 md:px-10">
        <StartLink />
      </div>
    </section>
  )
}
