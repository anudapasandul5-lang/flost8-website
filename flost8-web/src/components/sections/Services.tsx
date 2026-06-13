import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'
import { SERVICES } from '../../lib/config'
import { useMotionSafe } from '../../hooks/useMotionSafe'

// Scene image per service (index-matched to SERVICES)
const SERVICE_IMAGES = ['/ui2/gen/djbooth.jpg', '/ui2/gen/street.jpg', '/ui2/gen/studio.jpg']

export default function Services() {
  const { reduce } = useMotionSafe()

  return (
    <section id="about" className="relative bg-base pt-14 md:pt-20 pb-6 md:pb-6">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div>
          <p className="font-grotesk uppercase tracking-[0.25em] text-[13px] text-accent-ink">
            What We Do
          </p>
          <h2 className="mt-4 font-display text-ink text-5xl md:text-7xl leading-[0.9]">
            WHAT WE DO
          </h2>
        </div>

        <div className="mt-10 md:mt-20 border-t border-white/10">
          {SERVICES.map((service, i) => (
            <motion.div
              key={service.no}
              whileHover={reduce ? undefined : 'hover'}
              initial="rest"
              animate="rest"
              className="group relative grid grid-cols-[auto_1fr] md:grid-cols-[120px_1fr_260px] items-center gap-x-6 md:gap-x-10 gap-y-2 py-6 md:py-12 border-b border-white/10"
            >
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10"
                variants={{
                  rest: { backgroundColor: 'rgba(157, 20, 255, 0)' },
                  hover: { backgroundColor: 'var(--accent-soft)' },
                }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />

              <span className="font-display text-accent text-6xl md:text-8xl leading-none self-start md:self-center">
                {service.no}
              </span>

              <div className="col-span-1">
                <motion.h3
                  className="font-display text-ink text-3xl md:text-5xl"
                  variants={{ rest: { x: 0 }, hover: { x: 8 } }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                >
                  {service.title}
                </motion.h3>
                <p className="mt-3 font-grotesk text-[var(--ink-50)] text-base md:text-lg max-w-[46ch]">
                  {service.line}
                </p>
              </div>

              <div className="col-span-2 md:col-span-1 mt-4 md:mt-0 overflow-hidden rounded-xl edge-refract">
                <img
                  src={SERVICE_IMAGES[i]}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="grade-portrait h-32 w-full object-cover md:h-32"
                />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 md:mt-8">
          <Link
            to="/bookings"
            className="inline-flex min-h-[44px] items-center font-grotesk text-accent-ink text-base md:text-lg hover:text-accent transition-colors"
          >
            Start a project
            <ArrowRight size={20} weight="bold" className="ml-2" />
          </Link>
        </div>
      </div>
    </section>
  )
}
