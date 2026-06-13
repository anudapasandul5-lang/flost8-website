import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'
import { SERVICES } from '../../lib/config'
import RevealLines from '../ui/RevealLines'
import { useMotionSafe } from '../../hooks/useMotionSafe'

// Scene image per service (index-matched to SERVICES)
const SERVICE_IMAGES = ['/ui2/gen/djbooth.jpg', '/ui2/gen/street.jpg', '/ui2/gen/studio.jpg']

interface StackCardProps {
  service: (typeof SERVICES)[number]
  index: number
  image: string
  reduce: boolean
}

function StackCard({ service, index, image, reduce }: StackCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  // Hooks declared unconditionally — Rules of Hooks
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'start start'],
  })
  const scale = useTransform(scrollYProgress, [0, 1], [1.25, 1])

  if (reduce) {
    // Plain vertical stack — no sticky, no parallax
    return (
      <div className="mb-6 last:mb-0">
        <div
          ref={cardRef}
          className="relative w-full max-w-[1100px] mx-auto rounded-[2rem] edge-refract overflow-hidden bg-base-raise"
          style={{ minHeight: '56vh' }}
        >
          <div className="relative z-10 flex flex-col md:flex-row h-full">
            {/* Text content */}
            <div className="flex flex-col justify-center px-8 md:px-12 py-10 md:py-14 flex-1">
              <span className="font-display text-accent text-7xl md:text-8xl leading-none mb-4">
                {service.no}
              </span>
              <h3 className="font-display text-ink text-4xl md:text-6xl leading-[0.95] mb-5">
                {service.title}
              </h3>
              <p className="font-grotesk text-[var(--ink-72)] text-[1rem] md:text-lg max-w-[52ch]">
                {service.line}
              </p>
            </div>
            {/* Image — static, no scale */}
            <div className="md:w-[42%] overflow-hidden relative">
              <img
                src={image}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="grade-portrait h-56 md:h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Animated sticky-stacking path
  const topOffset = `calc(6vh + ${index * 28}px)`

  return (
    // cardContainer: h-[100dvh] scroll region that pins
    <div className="relative h-[100dvh] flex items-start justify-center sticky top-0">
      {/* card: sticky with staggered offset, non-static (sticky) so useScroll target is valid */}
      <div
        ref={cardRef}
        className="relative w-full max-w-[1100px] rounded-[2rem] edge-refract overflow-hidden bg-base-raise"
        style={{ top: topOffset, minHeight: '56vh', position: 'sticky' }}
      >
        <div className="relative z-10 flex flex-col md:flex-row h-full">
          {/* Text content */}
          <div className="flex flex-col justify-center px-8 md:px-12 py-10 md:py-14 flex-1">
            <span className="font-display text-accent text-7xl md:text-8xl leading-none mb-4">
              {service.no}
            </span>
            <h3 className="font-display text-ink text-4xl md:text-6xl leading-[0.95] mb-5">
              {service.title}
            </h3>
            <p className="font-grotesk text-[var(--ink-72)] text-[1rem] md:text-lg max-w-[52ch]">
              {service.line}
            </p>
          </div>
          {/* Image with parallax scale */}
          <div className="md:w-[42%] overflow-hidden relative">
            <motion.div
              className="h-56 md:h-full w-full"
              style={{ scale, willChange: 'transform' }}
            >
              <img
                src={image}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="grade-portrait h-full w-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Services() {
  const { reduce } = useMotionSafe()

  return (
    <section id="about" className="relative bg-base pt-14 md:pt-20 pb-6 md:pb-6">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Header */}
        <div>
          <p className="font-grotesk uppercase tracking-[0.25em] text-[13px] text-accent-ink">
            Three ways we work
          </p>
          <RevealLines
            lines={['WHAT WE DO']}
            className="mt-4 font-display text-ink text-5xl md:text-7xl leading-[0.9]"
          />
        </div>

        {/* Stacking cards */}
        <div className={reduce ? 'mt-10 md:mt-14' : 'mt-4 md:mt-6'}>
          {SERVICES.map((service, i) => (
            <StackCard
              key={service.no}
              service={service}
              index={i}
              image={SERVICE_IMAGES[i]}
              reduce={reduce}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-6 md:mt-8">
          <Link
            to="/bookings"
            className="inline-flex min-h-[44px] items-center font-grotesk text-accent-ink text-[1rem] md:text-lg hover:text-accent transition-colors"
          >
            Start a project
            <ArrowRight size={20} weight="bold" className="ml-2" />
          </Link>
        </div>
      </div>
    </section>
  )
}
