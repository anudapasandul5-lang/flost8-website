import { motion } from 'framer-motion'
import { Headphones, Eye } from '@phosphor-icons/react'
import { useTextScramble } from '../../hooks/useTextScramble'

// ── Vinyl "O" SVG ────────────────────────────────────────────────────────────
function VinylO({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Outer ring */}
      <circle cx="32" cy="32" r="30" fill="#1A1535" stroke="#7B3FF5" strokeWidth="2" />
      {/* Grooves */}
      <circle cx="32" cy="32" r="26" fill="none" stroke="#7B3FF5" strokeWidth="0.5" opacity="0.4" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#7B3FF5" strokeWidth="0.5" opacity="0.4" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#7B3FF5" strokeWidth="0.5" opacity="0.4" />
      {/* Label centre */}
      <circle cx="32" cy="32" r="10" fill="#7B3FF5" />
      {/* Spindle */}
      <circle cx="32" cy="32" r="3" fill="#1A1535" />
    </svg>
  )
}

// ── Entrance spring variants ─────────────────────────────────────────────────
const leftVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 80, damping: 20, delay: 0.2, duration: 0.8 },
  },
}

const rightVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 80, damping: 20, delay: 0.4, duration: 0.8 },
  },
}

// ── Hero ─────────────────────────────────────────────────────────────────────
export default function Hero() {
  const line1 = useTextScramble('WHERE ARTIST', 1400)
  const line2 = useTextScramble('BECOME CULTURE', 1800)

  return (
    <section
      className="relative min-h-[100dvh] w-full overflow-hidden flex items-center"
      aria-label="Hero"
    >
      {/* Background: dark gradient placeholder (no DJ photo asset yet) */}
      <div
        role="img"
        aria-label="DJ performing at a live event"
        className="absolute inset-0 bg-gradient-to-br from-navy via-[#2a1a5e] to-navy"
      >
        {/* Subtle grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 39px, #78F4F5 39px, #78F4F5 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #78F4F5 39px, #78F4F5 40px)',
          }}
        />
        {/* Radial purple glow */}
        <div className="absolute inset-0 bg-radial-gradient" style={{
          background: 'radial-gradient(ellipse 60% 50% at 70% 50%, rgba(123,63,245,0.18) 0%, transparent 70%)',
        }} />
      </div>

      {/* Content grid */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 py-16 flex flex-col md:flex-row items-center md:items-stretch gap-12 md:gap-0">

        {/* ── LEFT: Logo / Brand ── */}
        <motion.div
          className="flex-shrink-0 md:w-[40%] flex flex-col items-center md:items-start justify-center"
          variants={leftVariant}
          initial="hidden"
          animate="visible"
        >
          {/* Logo mark — 2-row stacked layout */}
          <div className="select-none leading-none" aria-label="FLOST8 brand logo">
            {/* Row 1: fl + O (vinyl) */}
            <div className="flex items-center">
              <span
                className="font-display text-7xl md:text-8xl text-purple leading-none"
                style={{ letterSpacing: '-0.02em' }}
              >
                fl
              </span>
              <VinylO className="w-[4rem] h-[4rem] md:w-[5rem] md:h-[5rem] -mx-1" />
            </div>
            {/* Row 2: st8 */}
            <div>
              <span
                className="font-display text-7xl md:text-8xl text-cyan leading-none"
                style={{ letterSpacing: '-0.02em' }}
              >
                st8
              </span>
            </div>
          </div>

          {/* Thin divider (decorative) */}
          <div className="mt-6 w-16 h-[2px] bg-purple opacity-60 md:self-start" />
        </motion.div>

        {/* ── RIGHT: Headline + Tagline + CTAs ── */}
        <motion.div
          className="md:w-[60%] flex flex-col items-center md:items-start justify-center md:pl-12 gap-6 text-center md:text-left"
          variants={rightVariant}
          initial="hidden"
          animate="visible"
        >
          {/* Headline */}
          <h1
            className="font-display text-5xl md:text-8xl lg:text-9xl text-white leading-none tracking-tight"
            aria-label="WHERE ARTIST BECOME CULTURE"
          >
            <span className="block">{line1}</span>
            <span className="block">{line2}</span>
          </h1>

          {/* Tagline */}
          <p className="font-body text-white/70 text-base md:text-lg max-w-md">
            We Turn Performances Into Visibility, Visibility Into Bookings
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center md:items-start gap-3 w-full sm:w-auto">
            <a
              href="#roster"
              className="inline-flex items-center gap-2 bg-purple rounded-full px-6 py-3 text-white font-body font-medium hover:opacity-90 transition-opacity w-full sm:w-auto justify-center"
            >
              <Headphones size={18} weight="bold" />
              Become an Artist
            </a>
            <a
              href="#roster"
              className="inline-flex items-center gap-2 border border-white/40 rounded-full px-6 py-3 text-white font-body font-medium hover:border-white transition-colors w-full sm:w-auto justify-center"
            >
              <Eye size={18} weight="bold" />
              See the Roster
            </a>
          </div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
        <span className="font-body text-white text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-white/40" />
      </div>
    </section>
  )
}
