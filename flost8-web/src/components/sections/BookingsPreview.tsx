import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from '@phosphor-icons/react'
import { fadeUp, staggerParent } from '../../lib/motion'

export default function BookingsPreview() {
  const shouldReduce = useReducedMotion()

  return (
    <section id="book" className="relative bg-base py-10 md:py-20 overflow-hidden">
      {/* Crowd backdrop */}
      <img
        src="/ui2/gen/crowd.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-base via-base/85 to-base/40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-base/70 via-transparent to-base"
      />

      {/* Oversized watermark */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-accent/5 text-[22vw] leading-none md:text-[16vw]"
      >
        BOOK
      </span>

      <motion.div
        className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-10"
        variants={staggerParent}
        initial={shouldReduce ? 'visible' : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.h2
          variants={fadeUp}
          className="font-display text-ink text-6xl md:text-8xl leading-[0.92]"
        >
          READY WHEN
          <br />
          YOU ARE.
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mt-6 font-grotesk text-[var(--ink-72)] max-w-[52ch] text-lg md:text-xl"
        >
          Lock a FLOST8 artist for your night, brand, or event.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/bookings"
            className="accent-press edge-refract inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-7 py-4 font-grotesk text-ink"
          >
            Book Now
            <ArrowUpRight size={20} weight="bold" />
          </Link>
          <a
            href="mailto:bookings@flost8.lk"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--accent-line)] px-7 py-4 font-grotesk text-ink transition-colors hover:bg-[var(--accent-soft)]"
          >
            Become an Artist
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}
