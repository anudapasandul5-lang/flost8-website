import { motion, useMotionValue, useTransform } from 'framer-motion'
import { ArrowUpRight } from '@phosphor-icons/react'

export interface Artist {
  slug: string
  name: string
  role: string
}

interface ArtistCardProps {
  artist: Artist
  index: number
}

export default function ArtistCard({ artist }: ArtistCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-100, 100], [8, -8])
  const rotateY = useTransform(x, [-100, 100], [-8, 8])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    x.set(e.clientX - rect.left - rect.width / 2)
    y.set(e.clientY - rect.top - rect.height / 2)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <a href="#bookings" className="block">
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer relative overflow-hidden border-2 border-cyan rounded-none"
      >
        {/* Photo */}
        <div className="aspect-[4/5] relative">
          <img
            src={`/photos/${artist.slug}.png`}
            alt={artist.name}
            className="object-cover object-top w-full h-full"
            loading="lazy"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Name card strip */}
        <div className="flex items-center gap-3 bg-white p-3">
          {/* Red arrow button */}
          <div className="bg-red w-12 h-12 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight size={20} color="white" weight="bold" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl text-off-black tracking-wide uppercase leading-tight">
              {artist.name}
            </p>
            <p className="font-body text-sm text-off-black/60 truncate">{artist.role}</p>
          </div>
        </div>
      </motion.div>
    </a>
  )
}
