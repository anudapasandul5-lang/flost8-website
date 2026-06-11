import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, PaperPlaneTilt } from '@phosphor-icons/react'
import { useTextScramble } from '../../hooks/useTextScramble'
import { staggerParentSlow, fadeUp } from '../../lib/motion'

export default function Hero() {
  const line1 = useTextScramble('WHERE ARTISTS', 1100)
  const line2 = useTextScramble('BECOME CULTURE', 1500)

  const shouldReduce = useReducedMotion()

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
    <section
      ref={sectionRef}
      className="relative min-h-[100dvh] overflow-hidden bg-base"
      aria-label="Hero"
    >
      <div className="absolute inset-0" aria-hidden="true">
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
      </div>

      {/* Dark grade for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-base/40 via-base/55 to-base" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-r from-base/80 to-transparent" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col justify-center px-6 pb-28 pt-32 md:px-10 md:pb-36 md:pt-36">
        <motion.div
          className="max-w-full md:max-w-[60%]"
          variants={staggerParentSlow}
          initial={shouldReduce ? 'visible' : 'hidden'}
          animate="visible"
        >
          <motion.p
            variants={fadeUp}
            className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink"
          >
            Colombo &middot; Artist Collective
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="mt-4 font-display text-[72px] leading-[0.9] text-ink md:text-[112px] lg:text-[128px]"
          >
            {line1}
            <br />
            {line2}
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-4 font-grotesk text-xl text-[var(--ink-72)] md:text-2xl"
          >
            not an agency. a movement.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <a
              href="/bookings"
              className="edge-refract accent-press inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 font-grotesk text-ink"
            >
              <ArrowUpRight size={18} weight="bold" />
              Book Now
            </a>
            <a
              href="mailto:bookings@flost8.lk"
              className="accent-press inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[var(--accent-line)] bg-transparent px-6 py-3.5 font-grotesk text-ink transition-colors duration-300 hover:bg-[var(--accent-soft)]"
            >
              <PaperPlaneTilt size={18} weight="bold" />
              Become an Artist
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
