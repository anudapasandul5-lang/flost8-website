import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

export default function LivePhoto() {
  const sectionRef = useRef<HTMLElement>(null)
  const shouldReduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], shouldReduce ? ['0%', '0%'] : ['-8%', '8%'])

  return (
    <section ref={sectionRef} className="relative min-h-[60vh] md:min-h-[80vh] overflow-hidden bg-base">
      <motion.img
        src="/ui2/live-photo.jpeg"
        alt=""
        aria-hidden
        style={{ y: imgY }}
        className="duotone-purple absolute inset-0 h-full w-full object-cover opacity-70 will-change-transform"
      />

      {/* Blend overlays so the image dissolves into the page */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base via-base/40 to-base/70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-base/60 via-transparent to-base/60" />

      <div className="relative z-10 flex h-full min-h-[60vh] md:min-h-[80vh] flex-col justify-center px-6 md:px-10">
        <div className="mx-auto w-full max-w-[1400px]">
          <h2 className="font-display text-ink text-5xl md:text-8xl leading-[0.9]">
            THE ROOM
            <br />
            REMEMBERS.
          </h2>
          <p className="mt-4 font-grotesk text-[var(--ink-72)] text-lg md:text-xl">
            Colombo, 2:14am.
          </p>
        </div>
      </div>
    </section>
  )
}
