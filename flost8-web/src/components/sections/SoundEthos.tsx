import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import EyebrowRule from '../ui/EyebrowRule'

export default function SoundEthos() {
  const shouldReduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], shouldReduce ? ['0%', '0%'] : ['-8%', '8%'])

  return (
    <section ref={ref} className="relative min-h-[70vh] overflow-hidden bg-base md:min-h-[88vh]">
      <motion.img
        style={{ y }}
        src="/ui2/gen/silhouette.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute -top-[8%] left-0 h-[116%] w-full object-cover opacity-70"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-base via-base/40 to-base/70" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-base/75 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-[1400px] flex-col justify-end px-6 pb-16 md:min-h-[88vh] md:px-10 md:pb-24">
        <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
          The Sound
        </p>
        <EyebrowRule />
        <h2 className="mt-4 font-display text-ink text-6xl leading-[0.9] md:text-8xl">
          PROGRESSIVE SOUND.
          <br />
          UNDERGROUND SOUL.
        </h2>
        <p className="mt-5 max-w-[52ch] font-grotesk text-lg text-white/80 md:text-xl">
          Melodic, relentless, built for the 3am moment — the long build, the drop,
          the room moving as one.
        </p>
      </div>
    </section>
  )
}
