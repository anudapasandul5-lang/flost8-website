import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { EASE } from '../../lib/motion'
import { useMotionSafe } from '../../hooks/useMotionSafe'

interface StatCardProps {
  value: string
  label: string
  index: number
}

function useCountUp(target: string, duration: number, inView: boolean): string {
  const { reduce, guard } = useMotionSafe()
  const hasDigits = /^\D*\d+.*?$/.test(target)
  const [display, setDisplay] = useState(() => (reduce || !hasDigits ? target : '0'))

  useEffect(() => {
    if (reduce || !hasDigits) return
    if (!inView) return
    const match = target.match(/^(\D*)(\d+)(.*?)$/)
    if (!match) return
    const prefix = match[1]
    const num = parseInt(match[2], 10)
    const suffix = match[3]
    const totalSteps = 45
    const stepTime = duration / totalSteps

    return guard(() => {
      let step = 0

      // ease-out cubic: fast start, decelerates into final value
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

      const timer = setInterval(() => {
        step += 1
        const progress = easeOut(step / totalSteps)
        const currentVal = Math.round(progress * num)

        if (step >= totalSteps) {
          setDisplay(`${prefix}${num}${suffix}`)
          clearInterval(timer)
        } else {
          setDisplay(`${prefix}${currentVal}${suffix}`)
        }
      }, stepTime)

      return () => clearInterval(timer)
    })
  }, [reduce, guard, hasDigits, inView, target, duration])

  return display
}

export function StatCard({ value, label, index }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const count = useCountUp(value, 2100 + index * 300, inView)
  const { reduce } = useMotionSafe()

  return (
    <motion.div
      ref={ref}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex min-h-[140px] flex-col items-center justify-center rounded-[16px] border-[3px] border-white bg-[#EA4323] px-3 py-6 text-center shadow-[0_6px_0_rgba(0,0,0,0.45)] sm:min-h-[200px] sm:rounded-[20px] sm:border-[4px] sm:px-6 sm:py-8 lg:min-h-[232px]"
    >
      <span className="font-display text-[56px] leading-none text-white sm:text-[80px] lg:text-[96px]">{count}</span>
      <span className="mt-2 whitespace-pre-line font-display text-[20px] leading-[1.1] text-white sm:mt-4 sm:text-[28px] lg:text-[36px]">{label}</span>
    </motion.div>
  )
}
