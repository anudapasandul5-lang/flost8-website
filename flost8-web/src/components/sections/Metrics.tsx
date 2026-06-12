import { useRef } from 'react'
import { useReducedMotion, useInView } from 'framer-motion'
import { METRICS } from '../../lib/config'
import { useCountUp } from '../../hooks/useCountUp'

const stats = [
  { value: METRICS.bookingsDriven, label: 'Bookings driven' },
  { value: METRICS.activePartners, label: 'Active partners' },
  { value: METRICS.citiesReached, label: 'Cities reached' },
  { value: METRICS.monthlyReach, label: 'Monthly reach' },
] as const

function Counter({ value, reduce, active }: { value: string; reduce: boolean; active: boolean }) {
  const target = parseInt(value, 10) || 0
  const n = useCountUp(target, active, reduce)
  // keep the leading-zero look for '00'-style placeholders until real data lands
  const text = value.length >= 2 && target < 10 ? String(n).padStart(value.length, '0') : String(n)
  return <>{text}</>
}

export function Metrics() {
  const shouldReduce = useReducedMotion()
  const gridRef = useRef<HTMLDivElement>(null)
  const inView = useInView(gridRef, { once: true, margin: '-80px' })

  return (
    <section className="relative overflow-hidden bg-base pt-4 md:pt-5 pb-12 md:pb-16">
      <img
        src="/ui2/gen/stage.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-base via-base/85 to-base" />
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-10">
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
                <Counter value={stat.value} reduce={!!shouldReduce} active={inView} />
                <span className="text-accent">+</span>
              </span>
              <span className="font-grotesk text-xs uppercase tracking-[0.15em] text-[var(--ink-50)] md:text-sm">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
