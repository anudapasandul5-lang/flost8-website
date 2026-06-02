import { ArrowRight } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { EASE } from '../../lib/motion'

interface AudienceCardProps {
  title: string
  subtitle: string
  href: string
  ctaLabel?: string
}

export default function AudienceCard({ title, subtitle, href, ctaLabel = 'Call to action' }: AudienceCardProps) {
  return (
    <motion.a
      href={href}
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.35, ease: EASE }}
      variants={{ hover: { y: -6 } }}
      className="group flex flex-col gap-4 rounded-[16px] border border-red/45 bg-[#E36AC0] px-5 py-6 shadow-[0_8px_14px_rgba(0,0,0,0.18)] sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:px-9 sm:py-7"
    >
      <div>
        <p className="font-script text-[30px] uppercase leading-none text-lime sm:text-[34px]">{title}</p>
        <p className="mt-2 font-body text-[18px] italic leading-none text-lime sm:text-[20px]">{subtitle}</p>
      </div>
      <span className="self-start inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 font-body italic text-purple">
        <motion.span
          className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-purple text-purple sm:h-10 sm:w-10"
          variants={{
            hover: { x: 2, y: -2, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }
          }}
        >
          <ArrowRight size={22} weight="bold" />
        </motion.span>
        {ctaLabel}
      </span>
    </motion.a>
  )
}
