import { motion } from 'framer-motion'
import { Eye, Headphones } from '@phosphor-icons/react'
import { useTextScramble } from '../../hooks/useTextScramble'

const logoVariant = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 70, damping: 18, delay: 0.1 } },
}

const textVariant = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 70, damping: 18, delay: 0.25 } },
}

const ctaVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 80, damping: 20, delay: 0.6 } },
}

export default function Hero() {
  const line1 = useTextScramble('WHERE ARTIST', 1400)
  const line2 = useTextScramble('BECOME CULTURE', 1900)

  return (
    <section className="relative h-auto min-h-[500px] overflow-hidden bg-navy md:h-[640px]" aria-label="Hero">
      <img
        src="/ui2/hero-bg.jpeg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[#302A66]/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#302A66]/35 via-[#AE43F7]/10 to-[#302A66]/45" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1040px] items-center justify-center gap-16 px-6 py-20 md:py-0">
        <motion.img
          src="/logo-transparent.png"
          alt="FLOST8"
          className="hidden w-[335px] shrink-0 md:block"
          variants={logoVariant}
          initial="hidden"
          animate="visible"
        />

        <motion.div
          className="max-w-[650px] text-center md:text-left"
          variants={textVariant}
          initial="hidden"
          animate="visible"
        >
          <h1 className="font-display text-[64px] leading-[0.92] text-white md:text-[82px] lg:text-[92px]">
            {line1}
            <br />
            {line2}
          </h1>
          <p className="mt-5 font-body text-lg italic text-white/80">
            not an agency. a movement.
          </p>

          <motion.div
            className="mt-6 flex flex-col items-center gap-4 sm:flex-row md:items-start"
            variants={ctaVariant}
            initial="hidden"
            animate="visible"
          >
            <a
              href="mailto:bookings@flost8.lk"
              className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full border border-cyan/70 bg-purple/80 px-5 py-3 font-body italic text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Headphones size={18} weight="bold" />
              Become an Artist
            </a>
            <a
              href="/#roster"
              className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full border border-cyan bg-navy/35 px-5 py-3 font-body italic text-cyan transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Eye size={18} weight="bold" />
              See the Roster
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
