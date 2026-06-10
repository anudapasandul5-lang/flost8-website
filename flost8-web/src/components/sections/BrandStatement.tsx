import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import Marquee from '../ui/Marquee'
import { EASE } from '../../lib/motion'

const leftCopy = 'FLO ST8 is a platform that connects artists, brands, events, venues, and content.'
const rightCopy = 'We turn performances into visibility, visibility into bookings, and bookings into long-term growth.'

export default function BrandStatement() {
  const sectionRef = useRef<HTMLElement>(null)
  const shouldReduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })
  const photoY = useTransform(scrollYProgress, [0, 1], shouldReduce ? ['0%', '0%'] : ['-8%', '8%'])

  return (
    <section ref={sectionRef} id="about" className="scroll-mt-32 overflow-x-hidden bg-cream md:scroll-mt-24">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden px-gutter py-section-tight md:min-h-[520px]">
        {/* Headline — two stacked lines */}
        <div className="relative z-10 flex flex-col gap-0">
          <div className="flex items-baseline gap-3 sm:gap-5 md:gap-6">
            <motion.span
              className="font-display text-[56px] leading-none text-black sm:text-[72px] md:text-[88px] lg:text-[94px]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE, delay: 0 }}
            >WHERE</motion.span>
            <motion.span
              className="font-script text-[52px] leading-none text-red sm:text-[68px] md:text-[80px] lg:text-[92px]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
            >ARTISTS</motion.span>
          </div>
          <div className="flex items-baseline gap-3 sm:gap-5 md:gap-6">
            <motion.span
              className="font-display text-[56px] leading-none text-black sm:text-[72px] md:text-[88px] lg:text-[94px]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
            >BECOME</motion.span>
            <motion.span
              className="font-script text-display-md leading-none text-red sm:text-display-lg lg:text-display-xl lg:-mr-12"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
            >CULTURE</motion.span>
          </div>
        </div>

        {/* Bottom-left description */}
        <motion.p
          className="relative z-10 mt-6 max-w-[340px] font-body text-[17px] font-semibold italic leading-[1.45] text-black sm:text-[19px] md:mt-3 md:max-w-[360px]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: EASE, delay: 0.4 }}
        >
          {leftCopy}
        </motion.p>

        {/* Right tagline */}
        <motion.p
          className="relative z-10 mt-5 max-w-none font-body text-[17px] font-semibold italic leading-[1.45] text-black sm:text-[19px] md:absolute md:right-8 md:top-[160px] md:mt-0 md:max-w-[240px] md:text-right lg:right-[68px]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: EASE, delay: 0.5 }}
        >
          {rightCopy}
        </motion.p>

        {/* Ghost word behind artist photo */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 z-0 hidden -translate-x-1/2 select-none font-league text-display-2xl text-outline-navy md:block"
        >
          CULTURE
        </span>

        {/* Artist photo — center */}
        <motion.div
          className="absolute bottom-0 left-[38%] z-[1] hidden -translate-x-1/2 md:block lg:left-[28%]"
          style={{ y: photoY }}
        >
          <motion.img
            src="/hero-artist.png"
            alt=""
            aria-hidden="true"
            className="h-[460px] w-auto object-contain grayscale lg:h-[510px]"
            style={{ mixBlendMode: 'multiply', filter: 'grayscale(1) drop-shadow(0 -8px 32px rgba(0,0,0,0.18)) drop-shadow(0 24px 48px rgba(0,0,0,0.22))' }}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.3 }}
          />
        </motion.div>
      </div>
      <Marquee />
    </section>
  )
}
