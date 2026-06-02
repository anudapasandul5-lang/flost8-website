import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

export default function LivePhoto() {
  const sectionRef = useRef<HTMLElement>(null)
  const shouldReduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })
  const imgScale = useTransform(scrollYProgress, [0, 1], shouldReduce ? [1, 1] : [1.04, 1.0])

  return (
    <section ref={sectionRef} className="bg-navy px-4 pb-16 sm:px-8 lg:px-10 lg:pb-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="relative overflow-hidden">
          <motion.img
            src="/ui2/live-photo.jpeg"
            alt="A packed FLOST8 event with stage lighting and crowd"
            className="h-[220px] w-full object-cover object-[50%_68%] will-change-transform sm:h-[300px] lg:h-[360px]"
            style={{ scale: imgScale }}
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: shouldReduce ? 1 : 1.04 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          />
          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      </div>
    </section>
  )
}
