import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from '@phosphor-icons/react'
import { motion, useMotionValue, useTransform, useSpring, useReducedMotion } from 'framer-motion'

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
  const ref = useRef<HTMLDivElement>(null)
  const shouldReduce = useReducedMotion()

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 130, damping: 36 })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 130, damping: 36 })

  const dynamicShadow = useTransform(
    [rotateX, rotateY],
    ([rx, ry]: number[]) =>
      shouldReduce
        ? '0 4px 14px rgba(0,0,0,0.45)'
        : `${-ry * 0.5}px ${8 + Math.abs(rx)}px ${24 + Math.abs(rx) * 2}px rgba(0,0,0,${0.3 + Math.abs(rx) / 100})`
  )

  const sheenBackground = useTransform(
    [rotateX, rotateY],
    ([rx, ry]: number[]) =>
      shouldReduce
        ? 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12) 0%, transparent 60%)'
        : `radial-gradient(circle at ${50 + (ry as number) * 2}% ${50 - (rx as number) * 2}%, rgba(255,255,255,0.12) 0%, transparent 60%)`
  )

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (shouldReduce) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleMouseLeave() {
    if (shouldReduce) return
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: shouldReduce ? 0 : rotateX,
        rotateY: shouldReduce ? 0 : rotateY,
        transformPerspective: 800,
        boxShadow: dynamicShadow,
      }}
      className="cursor-pointer"
    >
      <Link to={`/bookings?artist=${encodeURIComponent(artist.slug)}`} className="block">
        <article className="relative overflow-hidden bg-white border-[3px] border-cyan">
          <div className="aspect-[1/1.08] bg-black">
            <img
              src={`/photos/${artist.slug}.webp`}
              alt={artist.name}
              className="h-full w-full object-cover object-top grayscale transition-all duration-[750ms] hover:grayscale-0"
              loading="lazy"
            />
          </div>

          <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[80px_1fr]">
            <div className="flex h-[60px] items-center justify-center bg-red text-black sm:h-[76px]">
              <ArrowUpRight size={24} weight="bold" className="sm:hidden" />
              <ArrowUpRight size={38} weight="bold" className="hidden sm:block" />
            </div>
            <div className="flex h-[60px] flex-col justify-center px-3 sm:h-[76px] sm:px-4">
              <p className="border-b border-black pb-0.5 font-body text-[13px] uppercase leading-none tracking-wide text-black sm:pb-1 sm:text-[22px]">
                {artist.name}
              </p>
              <p className="pt-1 font-body text-[10px] leading-none text-black sm:pt-2 sm:text-[13px]">{artist.role}</p>
            </div>
          </div>

          {/* Specular sheen overlay — tracks tilt direction, pointer-events:none so it never blocks hover */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: sheenBackground,
              mixBlendMode: 'overlay',
            }}
          />
        </article>
      </Link>
    </motion.div>
  )
}
