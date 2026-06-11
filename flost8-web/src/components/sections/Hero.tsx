import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLenis } from 'lenis/react'
import { ArrowUpRight, PaperPlaneTilt } from '@phosphor-icons/react'
import { useHeroMotion } from '../../hooks/useHeroMotion'
import { staggerParentSlow, fadeUp } from '../../lib/motion'

export default function Hero() {
  const shouldReduce = useReducedMotion()
  const lenis = useLenis()

  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const line1Ref = useRef<HTMLSpanElement>(null)
  const prefixRef = useRef<HTMLSpanElement>(null)
  const wordRef = useRef<HTMLSpanElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  useHeroMotion({
    sectionRef,
    line1Ref,
    prefixRef,
    wordRef,
    glowRef,
    shouldReduce: !!shouldReduce,
    lenis,
  })

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
          className="h-full w-full object-cover transition-opacity duration-[1050ms]"
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
            className="h-full w-full object-cover transition-opacity duration-[1050ms]"
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

      {/* Cursor-follow glow — pointer/desktop only, toggled by useHeroMotion */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-[5] h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-md transition-opacity duration-300"
        style={{
          marginLeft: '-280px',
          marginTop: '-280px',
          background:
            'radial-gradient(circle, rgba(157,20,255,0.30), transparent 62%)',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col justify-center px-6 pb-28 pt-32 md:px-10 md:pb-36 md:pt-36">
        <motion.div
          className="max-w-full md:max-w-[72%]"
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

          <h1
            aria-label="WHERE ARTISTS BECOME CULTURE"
            className="mt-4 font-display text-[56px] leading-[0.92] text-ink sm:text-[68px] md:text-[92px] lg:text-[108px]"
          >
            <span ref={line1Ref}>WHERE ARTISTS</span>
            <br />
            <span ref={prefixRef}>BECOME </span>
            <span ref={wordRef} aria-hidden="true" className="text-accent">
              CULTURE
            </span>
          </h1>

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
              className="accent-press inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[var(--accent-line)] bg-transparent px-6 py-3.5 font-grotesk text-ink transition-colors duration-[450ms] hover:bg-[var(--accent-soft)]"
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
