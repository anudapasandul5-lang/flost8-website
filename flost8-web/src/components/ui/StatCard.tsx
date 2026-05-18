import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'

interface StatCardProps {
  value: string
  label: string
  index: number
}

function useCountUp(target: number, isInView: boolean, duration = 1500): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [isInView, target, duration])

  return count
}

export function StatCard({ value, label, index }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  const isPlaceholder = value === '00'
  const numericTarget = isPlaceholder ? 0 : parseInt(value, 10)
  const count = useCountUp(numericTarget, isInView && !isPlaceholder)

  const displayValue = isPlaceholder ? '00' : String(count).padStart(value.length, '0')

  return (
    <motion.div
      ref={ref}
      className="bg-orange rounded-2xl p-8 md:p-10 border border-white/20 flex flex-col justify-between"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
        delay: index * 0.1,
      }}
    >
      <span className="font-display text-6xl md:text-7xl text-white leading-none">
        {displayValue}
      </span>
      <span className="font-display text-base md:text-lg text-white/90 uppercase tracking-widest mt-2">
        {label}
      </span>
    </motion.div>
  )
}
