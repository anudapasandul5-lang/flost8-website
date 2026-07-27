import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useLenis } from 'lenis/react'
import { ArrowUpRight, PaperPlaneTilt } from '@phosphor-icons/react'
import { useHeroMotion } from '../../hooks/useHeroMotion'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import { staggerParentSlow, fadeUp } from '../../lib/motion'

export default function Hero() {
  const { reduce } = useMotionSafe()
  const lenis = useLenis()

  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const line1Ref = useRef<HTMLSpanElement>(null)
  const prefixRef = useRef<HTMLSpanElement>(null)
  const wordRef = useRef<HTMLSpanElement>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  useHeroMotion({
    sectionRef,
    line1Ref,
    prefixRef,
    wordRef,
    lenis,
  })

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  // ponytail: scale-only parallax. A y-translate needs an oversized layer to avoid gapping,
  // and that overscan zoomed the footage past the fold — artists lost their heads on short windows.
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.08])

  // Pause/resume the loop based on viewport visibility
  useEffect(() => {
    if (reduce || videoFailed) return
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
  }, [reduce, videoFailed])

  const showVideo = !reduce && !videoFailed

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100dvh] overflow-hidden bg-base"
      aria-label="Hero"
    >
      <motion.div
        className="absolute inset-0"
        aria-hidden="true"
        style={reduce ? undefined : { scale: bgScale }}
      >
        <img
          src="/ui2/hero-bg.jpeg"
          alt=""
          aria-hidden="true"
          width={1920}
          height={1080}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1050ms]"
          style={{
            // Anchor top: on wide/short windows cover trims top and bottom, and every scene puts
            // the artist's head in the upper third. This is the most headroom the crop can give.
            // ponytail: owner chose full-bleed footage over a padded top safe-area, so on the
            // beach scene the head still passes behind the 64px nav pill. Deliberate.
            objectPosition: 'center top',
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
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1050ms]"
            style={{
              objectPosition: 'center top',
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

      {/* Dark grade for legibility. Weighted to the top (nav) and the bottom (copy), deliberately
          thin through the middle band where the artist stands. */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-base/70 via-base/10 via-40% to-base"
        aria-hidden="true"
      />
      {/* Left scrim only where the copy sits, so it never dims the centre-framed subject.
          Masked at the top edge so it dissolves into the frame instead of banding. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[85%] bg-gradient-to-t from-base via-base/65 to-transparent md:bg-gradient-to-r md:from-base/90 md:via-base/55 md:to-transparent md:[mask-image:linear-gradient(to_top,black_30%,transparent_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col justify-end px-6 pb-16 pt-24 md:px-10 md:pb-20">
        <motion.div
          className="max-w-full md:max-w-[72%]"
          variants={staggerParentSlow}
          initial={reduce ? 'visible' : 'hidden'}
          animate="visible"
        >
          <h1
            aria-label="WHERE ARTISTS BECOME CULTURE"
            className="font-display text-[52px] leading-[0.92] text-ink sm:text-[62px] md:text-[80px] lg:text-[94px]"
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
            <Link
              to="/bookings"
              className="edge-refract accent-press inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 font-grotesk text-ink"
            >
              <ArrowUpRight size={18} weight="bold" />
              Book Now
            </Link>
            <Link
              to="/partner"
              className="accent-press inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[var(--accent-line)] bg-transparent px-6 py-3.5 font-grotesk text-ink transition-colors duration-[450ms] hover:bg-[var(--accent-soft)]"
            >
              <PaperPlaneTilt size={18} weight="bold" />
              Work With Us
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
