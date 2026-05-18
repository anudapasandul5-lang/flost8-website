import { ArrowRight } from '@phosphor-icons/react'

interface AudienceCardProps {
  title: string
  subtitle: string
  href: string
  ctaLabel?: string
}

export default function AudienceCard({ title, subtitle, href, ctaLabel = 'Book Now' }: AudienceCardProps) {
  return (
    <a
      href={href}
      className="block bg-hot-pink rounded-2xl p-6 md:p-8 min-h-[140px] flex items-center justify-between hover:opacity-90 transition-opacity"
    >
      <div>
        <p className="font-script text-2xl md:text-3xl text-lime italic">{title}</p>
        <p className="font-body text-sm text-white/80 mt-1">{subtitle}</p>
      </div>
      <div className="bg-lime text-navy rounded-full px-4 py-2 font-body text-sm font-medium flex items-center gap-2 shrink-0 ml-4">
        {ctaLabel}
        <ArrowRight size={16} weight="bold" />
      </div>
    </a>
  )
}
