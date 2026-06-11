import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from '@phosphor-icons/react'
import { staggerParent, fadeUp, SPRING } from '../../lib/motion'
import EyebrowRule from '../ui/EyebrowRule'

const panels = [
  {
    label: 'THE MOVEMENT',
    heading: 'Artists, not a client list.',
    body: 'FLOST8 is a collective. We build the people, the sound, and the rooms they take over — not a roster we rent out by the hour.',
    cta: 'How we think',
    img: '/ui2/gen/silhouette.jpg',
  },
  {
    label: 'UNDERGROUND',
    heading: 'Built where it happens.',
    body: 'From Colombo clubs, studios, and late nights — not boardrooms. The culture comes first because we live in it.',
    cta: 'Our world',
    img: '/ui2/gen/djstage.jpg',
  },
  {
    label: 'CAREERS',
    heading: 'Names that outlast a season.',
    body: 'We develop artists for the long game: identity, craft, and stage presence that compound, gig after gig.',
    cta: 'What we build',
    img: '/ui2/gen/crowddusk.jpg',
  },
  {
    label: 'CULTURE',
    heading: 'Moments people travel for.',
    body: 'Sets, visuals, and nights engineered to be remembered — and shared far beyond the room.',
    cta: 'See the work',
    img: '/ui2/gen/stage.jpg',
  },
] as const

const AUTO_CYCLE_MS = 4500

function Panel({
  panel,
  index,
  isActive,
  shouldReduce,
  onActivate,
}: {
  panel: (typeof panels)[number]
  index: number
  isActive: boolean
  shouldReduce: boolean | null
  onActivate: () => void
}) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onActivate()
    }
  }

  return (
    <motion.div
      layout={shouldReduce ? false : true}
      transition={shouldReduce ? { duration: 0 } : SPRING}
      variants={fadeUp}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
      className={`group edge-refract relative flex min-h-[64px] cursor-pointer flex-col overflow-hidden rounded-2xl bg-base-raise transition-colors duration-[450ms] md:h-full md:min-h-0 ${
        isActive ? 'flex-[5]' : 'flex-1'
      }`}
      style={isActive ? { backgroundColor: 'var(--accent-soft)' } : undefined}
    >
      {/* Scene backdrop */}
      <img
        src={panel.img}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-[750ms] ${
          isActive ? 'opacity-45' : 'opacity-20'
        }`}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base via-base/60 to-base/25"
      />

      {isActive && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[2px] bg-accent"
        />
      )}

      {/* Inactive: rotated label + index */}
      {!isActive && (
        <div className="relative z-10 flex h-full items-center justify-between px-5 py-4 md:flex-col md:items-center md:justify-between md:px-0 md:py-8">
          <span className="font-grotesk text-[12px] uppercase tracking-[0.2em] text-[var(--ink-50)] md:order-2 md:[writing-mode:vertical-rl] md:[transform:rotate(180deg)]">
            {panel.label}
          </span>
          <span className="font-display text-lg text-accent md:order-1 md:text-xl">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Active content */}
      {isActive && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: shouldReduce ? 0 : 0.15 }}
          className="relative z-10 flex h-full flex-col justify-end gap-3 p-6 md:p-8 lg:p-10"
        >
          <span className="font-display text-xl text-accent">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="font-display text-3xl leading-[0.95] text-ink md:text-5xl">
            {panel.heading}
          </h3>
          <p className="mt-1 max-w-[44ch] font-grotesk text-base font-medium leading-relaxed text-white/90">
            {panel.body}
          </p>
          <span className="mt-2 inline-flex w-fit items-center gap-1 font-grotesk text-sm text-accent-ink">
            {panel.cta}
            <ArrowUpRight size={16} weight="bold" />
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}

export default function WhatWeDo() {
  const shouldReduce = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (shouldReduce || paused) return

    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % panels.length)
    }, AUTO_CYCLE_MS)

    return () => window.clearInterval(id)
  }, [shouldReduce, paused])

  return (
    <section id="about" className="relative bg-base py-14 md:py-20">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <motion.div
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mb-12 md:mb-16"
        >
          <motion.p
            variants={fadeUp}
            className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink"
          >
            What We Do
          </motion.p>
          <EyebrowRule />
          <motion.h2
            variants={fadeUp}
            className="mt-3 font-display text-5xl leading-[0.9] text-ink md:text-7xl"
          >
            NOT AN{' '}
            <span className="line-through decoration-accent decoration-4 text-[var(--ink-50)]">
              AGENCY
            </span>
            . A MOVEMENT.
          </motion.h2>
        </motion.div>

        <motion.div
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          className="flex flex-col gap-2 md:h-[440px] md:flex-row md:gap-3"
        >
          {panels.map((panel, index) => (
            <Panel
              key={panel.label}
              panel={panel}
              index={index}
              isActive={activeIndex === index}
              shouldReduce={shouldReduce}
              onActivate={() => setActiveIndex(index)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
