import { motion } from 'framer-motion'
import Marquee from '../ui/Marquee'

const statementCopy = 'flost8 is a creative artist platform connecting artists, events, brands, venues, and content.'

const spring = { type: 'spring' as const, stiffness: 80, damping: 20 }

export default function BrandStatement() {
  return (
    <section id="about" className="scroll-mt-32 bg-[#EEEEEE] md:scroll-mt-24">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden px-4 pb-10 pt-14 sm:px-8 md:min-h-[300px] md:pb-0 md:pt-10 lg:px-[68px]">
        <div className="relative z-10 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1">
          <div className="flex items-baseline gap-3 sm:gap-5 md:gap-6">
            <motion.span
              className="font-display text-[56px] leading-none text-black sm:text-[72px] md:text-[88px] lg:text-[94px]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0 }}
            >WHERE</motion.span>
            <motion.span
              className="font-script text-[36px] leading-none text-red sm:text-[48px] md:text-[56px] lg:text-[64px]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.1 }}
            >ARTISTS</motion.span>
          </div>
          <div className="flex items-baseline gap-3 sm:gap-5 md:gap-6">
            <motion.span
              className="font-display text-[56px] leading-none text-black sm:text-[72px] md:text-[88px] lg:text-[94px]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.2 }}
            >BECOME</motion.span>
            <motion.span
              className="font-script text-[36px] leading-none text-red sm:text-[48px] md:text-[56px] lg:text-[64px]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.3 }}
            >CULTURE</motion.span>
          </div>
        </div>

        <motion.p
          className="relative z-10 mt-6 max-w-[330px] font-body text-[16px] font-semibold italic leading-[1.45] text-black sm:text-[18px] md:mt-2 md:max-w-[360px]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...spring, delay: 0.4 }}
        >
          {statementCopy}
        </motion.p>
        <motion.p
          className="relative z-10 mt-5 max-w-none font-body text-[16px] font-semibold italic leading-[1.45] text-black sm:text-[18px] md:absolute md:right-8 md:top-[136px] md:mt-0 md:max-w-[240px] md:text-right lg:right-9"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...spring, delay: 0.5 }}
        >
          {statementCopy}
        </motion.p>

        <motion.img
          src="/hero-artist.png"
          alt=""
          aria-hidden="true"
          className="absolute bottom-0 left-[35%] hidden h-[240px] w-auto -translate-x-1/2 object-contain grayscale md:block lg:left-[25%] lg:h-[280px]"
          style={{ mixBlendMode: 'multiply' }}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.3 }}
        />
      </div>
      <Marquee />
    </section>
  )
}
