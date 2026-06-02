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
          <motion.div style={{ scale: imgScale }} className="will-change-transform">
            <motion.img
              src="/ui2/live-photo.jpeg"
              alt="A packed FLOST8 event with stage lighting and crowd"
              className="h-[220px] w-full object-cover object-[50%_68%] sm:h-[300px] lg:h-[360px]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </motion.div>
          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      </div>
    </section>
  )
}
