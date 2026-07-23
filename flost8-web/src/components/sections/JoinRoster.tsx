import { Link } from 'react-router-dom'
import { ArrowUpRight } from '@phosphor-icons/react'
import EyebrowRule from '../ui/EyebrowRule'
import RevealLines from '../ui/RevealLines'

export default function JoinRoster() {
  return (
    <section id="join" className="relative bg-base py-10 md:py-20 overflow-hidden">
      {/* faded backdrop */}
      <img
        src="/ui2/gen/crowd.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-base via-base/85 to-base/40" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-base/70 via-transparent to-base" />
      {/* oversized watermark */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-accent/5 text-[22vw] leading-none md:text-[16vw]"
      >
        JOIN
      </span>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-10">
        <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">Become an artist</p>
        <EyebrowRule />
        <RevealLines lines={['JOIN THE ROSTER']} className="mt-3 font-display text-6xl md:text-8xl leading-[0.92] text-ink" />
        <p className="mt-6 font-grotesk text-[var(--ink-72)] text-lg md:text-xl max-w-[52ch]">
          An entry point into the movement.
        </p>
        <p className="mt-2 font-grotesk text-ink text-xl md:text-2xl max-w-[52ch]">
          We don't take everyone. We build the right ones.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/join"
            className="accent-press edge-refract inline-flex min-h-[48px] items-center gap-2 rounded-full bg-accent px-7 py-4 font-grotesk text-ink"
          >
            Join Roster <ArrowUpRight size={20} weight="bold" />
          </Link>
          <Link
            to="/partner"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-[var(--accent-line)] px-7 py-4 font-grotesk text-ink transition-colors hover:bg-[var(--accent-soft)]"
          >
            Work With FLOST8
          </Link>
        </div>
      </div>
    </section>
  )
}
