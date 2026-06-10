import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Eye, Headphones } from '@phosphor-icons/react'
import { useTextScramble } from '../../hooks/useTextScramble'
import { staggerParent, fadeUp } from '../../lib/motion'
import Button from '../ui/Button'

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
      <div className="absolute inset-0 overlay-scrim" />
      <div className="absolute inset-0 overlay-photo" />

      <div className="relative z-10 flex h-full flex-col justify-center px-gutter py-20 md:py-0">
        <motion.div
          className="max-w-[650px]"
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          animate="visible"
        >
          <motion.h1
            variants={fadeUp}
            className="font-display text-display-xl text-white"
          >
            {line1}
            <br />
            {line2}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="-mt-2 rotate-[-2deg] font-script text-3xl text-cyan md:-mt-4 md:text-5xl"
          >
            not an agency. a movement.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-6 flex flex-col items-start gap-4 sm:flex-row"
          >
            <Button to="/bookings" variant="primary" icon={<Eye size={18} weight="bold" />}>
              Book Now
            </Button>
            <Button href="mailto:bookings@flost8.lk" variant="outline" icon={<Headphones size={18} weight="bold" />} className="text-cyan">
              Become an Artist
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
