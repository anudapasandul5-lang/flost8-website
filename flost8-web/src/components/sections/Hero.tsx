import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Eye, Headphones } from '@phosphor-icons/react'
import { useTextScramble } from '../../hooks/useTextScramble'
import { staggerParent, fadeUp, EASE } from '../../lib/motion'

export default function Hero() {
  const line1 = useTextScramble('WHERE ARTIST', 1400)
  const line2 = useTextScramble('BECOME CULTURE', 1900)

  const shouldReduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const bgY = useTransform(scrollYProgress, [0, 1], shouldReduce ? ['0%', '0%'] : ['0%', '20%'])

  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  // Pause/resume the loop based on viewport visibility
  useEffect(() => {
    if (shouldReduce || videoFailed) return
    const video = videoRef.current
    const section = sectionRef.current
    if (!video || !section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => setVideoFailed(true))
        } else {
          video.pause()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [shouldReduce, videoFailed])

  const showVideo = !shouldReduce && !videoFailed

  return (
    <section ref={sectionRef} className="relative h-auto min-h-[500px] overflow-hidden bg-navy md:h-[640px]" aria-label="Hero">
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 will-change-transform"
        aria-hidden="true"
      >
        <img
          src="/ui2/hero-bg.jpeg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover transition-opacity duration-700"
          style={{
            height: '120%',
            top: '-10%',
            position: 'absolute',
            width: '100%',
            opacity: showVideo && videoReady ? 0 : 1,
          }}
        />
        {showVideo && (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/ui2/hero-bg.jpeg"
            aria-hidden="true"
            className="h-full w-full object-cover transition-opacity duration-700"
            style={{
              height: '120%',
              top: '-10%',
              position: 'absolute',
              width: '100%',
              opacity: videoReady ? 1 : 0,
            }}
            onCanPlay={() => setVideoReady(true)}
            onError={() => setVideoFailed(true)}
          >
            <source src="/ui2/hero-loop.webm" type="video/webm" />
            <source src="/ui2/hero-loop.mp4" type="video/mp4" />
          </video>
        )}
      </motion.div>
      <div className="absolute inset-0 bg-[#302A66]/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#302A66]/35 via-[#AE43F7]/10 to-[#302A66]/45" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1040px] flex-col items-center justify-center gap-6 px-6 py-16 md:flex-row md:gap-16 md:py-0">
        <img
          src="/logo-transparent.png"
          alt="FLOST8"
          className="w-[140px] shrink-0 md:w-[335px]"
        />

        <motion.div
          className="max-w-[650px] text-center md:text-left"
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          animate="visible"
        >
          <motion.h1
            variants={fadeUp}
            className="font-display text-[64px] leading-[0.92] text-white md:text-[82px] lg:text-[92px]"
          >
            {line1}
            <br />
            {line2}
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-0.5 font-body text-2xl italic text-white/80 md:text-4xl">
            not an agency. a movement.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-6 flex flex-col items-center gap-4 sm:flex-row md:items-start"
          >
            <motion.a
              href="/bookings"
              className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full border border-cyan/70 bg-purple/80 px-5 py-3 font-body italic text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
              whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(174,67,247,0.6)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <Eye size={18} weight="bold" />
              Book Now
            </motion.a>
            <motion.a
              href="mailto:bookings@flost8.lk"
              className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full border border-cyan bg-navy/35 px-5 py-3 font-body italic text-cyan"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <Headphones size={18} weight="bold" />
              Become an Artist
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
