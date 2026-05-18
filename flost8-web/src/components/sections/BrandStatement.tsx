import { motion } from 'framer-motion'
import Marquee from '../ui/Marquee'

const leftCopy = 'FLO ST8 is a platform that connects artists, brands, events, venues, and content.'
const rightCopy = 'We turn performances into visibility, visibility into bookings, and bookings into long-term growth.'

const spring = { type: 'spring' as const, stiffness: 80, damping: 20 }

export default function BrandStatement() {
  return (
    <section id="about" className="scroll-mt-20 bg-[#EEEEEE]">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden px-4 pb-10 pt-14 sm:px-8 lg:px-12 md:min-h-[410px] md:pb-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8">
          <div className="flex items-baseline gap-6">
            <motion.span
              className="font-display text-[56px] leading-none text-black sm:text-[72px] md:text-[88px] lg:text-[112px]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0 }}
            >WHERE</motion.span>
            <motion.span
              className="font-script text-[36px] leading-none text-red sm:text-[48px] md:text-[56px] lg:text-[70px]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.1 }}
            >ARTISTS</motion.span>
          </div>
          <div className="flex items-baseline gap-6">
            <motion.span
              className="font-display text-[56px] leading-none text-black sm:text-[72px] md:text-[88px] lg:text-[112px]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.2 }}
            >BECOME</motion.span>
            <motion.span
              className="font-script text-[36px] leading-none text-red sm:text-[48px] md:text-[56px] lg:text-[70px]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.3 }}
            >CULTURE</motion.span>
          </div>
        </div>

        <motion.p
          className="mt-9 max-w-[330px] font-body text-[16px] italic leading-[1.55] text-black sm:text-[21px]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...spring, delay: 0.4 }}
        >
          {leftCopy}
        </motion.p>
        <motion.p
          className="relative mt-5 max-w-none font-body text-[16px] italic leading-[1.55] text-black sm:text-[21px] md:absolute md:right-12 md:top-[178px] md:mt-0 md:max-w-[330px] md:text-right"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...spring, delay: 0.5 }}
        >
          {rightCopy}
        </motion.p>

        <motion.img
          src="/hero-artist.png"
          alt=""
          aria-hidden="true"
          className="hidden md:block absolute bottom-0 left-[36%] h-[380px] w-auto -translate-x-1/2 object-contain grayscale"
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
