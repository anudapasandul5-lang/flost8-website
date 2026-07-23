import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'
import { SERVICES } from '../../lib/config'
import { EASE } from '../../lib/motion'
import RevealLines from '../ui/RevealLines'
import EyebrowRule from '../ui/EyebrowRule'
import { useMotionSafe } from '../../hooks/useMotionSafe'

// Scene image per service (index-matched to SERVICES)
const SERVICE_IMAGES = ['/ui2/gen/djbooth.jpg', '/ui2/gen/street.jpg', '/ui2/gen/studio.jpg']
const TOTAL = SERVICES.length

type Service = (typeof SERVICES)[number]

/** Card visual — image on top (mobile) / to the side (desktop); fixed height for the stack. */
function CardInner({ service, image }: { service: Service; image: string }) {
  return (
    <div className="relative mx-auto flex h-[44vh] w-full max-w-[960px] flex-col overflow-hidden rounded-[1.5rem] bg-base-raise edge-refract shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] md:h-[46vh] md:flex-row md:rounded-[1.75rem]">
      {/* image: top band on mobile, right side on desktop */}
      <div className="relative h-28 w-full shrink-0 overflow-hidden md:order-last md:h-full md:w-[40%]">
        <img
          src={image}
          alt=""
          aria-hidden="true"
          width={1920}
          height={1080}
          loading="lazy"
          decoding="async"
          className="grade-portrait h-full w-full object-cover"
        />
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

/** Pinned-stage card — rises from below and stacks under the fixed header. */
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
  const y = useTransform(
    progress,
    [Math.max(0, enterAt - seg), enterAt],
    index === 0 ? ['0%', '0%'] : ['115%', '0%'],
  )
  const isLast = index === TOTAL - 1
  const scale = useTransform(progress, [enterAt, isLast ? 1 : enterAt + seg], [1, isLast ? 1 : 0.93])
  const lift = useTransform(progress, [enterAt, isLast ? 1 : enterAt + seg], ['0%', isLast ? '0%' : '-6%'])
  const opacity = useTransform(
    progress,
    [Math.max(0, enterAt - seg * 0.45), Math.max(0, enterAt - seg * 0.05)],
    index === 0 ? [1, 1] : [0, 1],
  )

  return (
    <motion.div style={{ y, opacity, zIndex: index }} className="absolute inset-x-0 top-0">
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

/** Plain vertical stack — no scroll-jack. Used on mobile + reduced-motion. */
function StackedCards({ animate }: { animate: boolean }) {
  return (
    <div className="mt-10 flex flex-col gap-5">
      {SERVICES.map((service, i) => (
        <motion.div
          key={service.no}
          initial={animate ? { opacity: 0, y: 24 } : false}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: '-12%' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <CardInner service={service} image={SERVICE_IMAGES[i]} />
        </motion.div>
      ))}
    </div>
  )
}

export default function Services() {
  const { reduce } = useMotionSafe()
  // Mobile: the 360vh pinned scroll-stack feels janky on touch → plain stacked cards.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setIsMobile(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const trackRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.0005,
  })

  if (reduce || isMobile) {
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

  // Pinned stage — header stays fixed, cards rise + stack beneath. All viewports.
  return (
    <section id="about" className="relative bg-base">
      <div ref={trackRef} className="relative h-[360vh] md:h-[340vh]">
        <div className="sticky top-0 h-[100dvh] overflow-hidden">
          <div className="mx-auto flex h-full max-w-[1400px] flex-col px-6 pb-10 pt-24 md:px-10 md:pb-10 md:pt-28">
            <Header />
            <div className="relative mt-12 min-h-0 flex-1 md:mt-12">
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
