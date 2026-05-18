import { motion } from 'framer-motion'
import Marquee from '../ui/Marquee'

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
}

const bodyText =
  'FLO ST8 is a platform that connects artists, brands, events, venues, and content.'

export default function BrandStatement() {
  return (
    <section className="bg-cream overflow-hidden" aria-label="Brand statement">
      {/* ── Padded content area ── */}
      <div className="py-20 md:py-32 px-6 md:px-12 max-w-7xl mx-auto">

        {/* Headline */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.7 }}
          className="flex flex-wrap items-baseline gap-x-4 md:gap-x-6 justify-center mb-16 md:mb-20"
        >
          <span className="font-display text-7xl md:text-9xl text-off-black leading-none uppercase">
            WHERE
          </span>
          <span className="font-script text-7xl md:text-9xl text-red italic leading-none">
            ARTISTS
          </span>
          <span className="font-display text-7xl md:text-9xl text-off-black leading-none uppercase">
            BECOME
          </span>
          <span className="font-script text-7xl md:text-9xl text-red italic leading-none">
            CULTURE
          </span>
        </motion.div>

        {/* 3-column split layout */}
        <div className="flex flex-col md:grid md:grid-cols-[35%_30%_35%] gap-8 md:gap-6 items-center">

          {/* Left: body text */}
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-body italic text-off-black/60 text-base md:text-lg max-w-xs text-center md:text-left"
          >
            {bodyText}
          </motion.p>

          {/* Center: B&W artist photo — hidden on mobile */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="hidden md:block w-full aspect-[3/4] overflow-hidden rounded-sm"
          >
            <img
              src="https://picsum.photos/seed/flost8artist/400/600"
              alt="Artist"
              className="w-full h-full object-cover grayscale"
            />
          </motion.div>

          {/* Right: body text (right-aligned) */}
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-body italic text-off-black/60 text-base md:text-lg max-w-xs text-center md:text-right"
          >
            {bodyText}
          </motion.p>
        </div>
      </div>

      {/* ── Full-width marquee band ── */}
      <Marquee speed={20} />
    </section>
  )
}
