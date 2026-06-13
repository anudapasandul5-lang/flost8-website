import { useRef } from 'react'
import { useInView } from 'framer-motion'
import { METRICS } from '../../lib/config'
import { useCountUp } from '../../hooks/useCountUp'
import { useMotionSafe } from '../../hooks/useMotionSafe'
import EyebrowRule from '../ui/EyebrowRule'

const stats = [
  { value: METRICS.bookingsDriven, label: 'Bookings driven' },
  { value: METRICS.activePartners, label: 'Active partners' },
  { value: METRICS.citiesReached, label: 'Cities reached' },
  { value: METRICS.contentProduced, label: 'Content produced' },
] as const

function Counter({ value, reduce, active }: { value: string; reduce: boolean; active: boolean }) {
  const target = parseInt(value, 10) || 0
  const n = useCountUp(target, active, reduce)
  // keep the leading-zero look for '00'-style placeholders until real data lands
  const text = value.length >= 2 && target < 10 ? String(n).padStart(value.length, '0') : String(n)
  return <>{text}</>
}

export function Metrics() {
  const { reduce } = useMotionSafe()
  const gridRef = useRef<HTMLDivElement>(null)
  const inView = useInView(gridRef, { once: true, margin: '-80px' })

  return (
    <section className="relative overflow-hidden bg-base py-10 md:py-20">
      <img
        src="/ui2/gen/stage.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-base via-base/85 to-base" />
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="mb-12 md:mb-16">
          <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
            Impact
          </p>
          <EyebrowRule />
          <h2 className="mt-3 font-display text-5xl leading-[0.9] text-ink md:text-7xl">
            IMPACT THAT
            <br />
            MOVES FORWARD
          </h2>
        </div>
        <div
          ref={gridRef}
          className="grid grid-cols-2 divide-x divide-y divide-white/10 border border-white/10 md:grid-cols-4 md:divide-y-0"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-start gap-3 px-6 py-6 md:px-10 md:py-7"
            >
              <span className="font-display text-6xl leading-none text-ink md:text-7xl">
                <Counter value={stat.value} reduce={reduce} active={inView} />
                <span className="text-accent">+</span>
              </span>
              <span className="font-grotesk text-xs uppercase tracking-[0.15em] text-[var(--ink-50)] md:text-sm">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-8 font-grotesk text-lg text-[var(--ink-50)] max-w-[46ch]">
          The movement is not growing. It&apos;s spreading.
        </p>
      </div>
    </section>
  )
}
