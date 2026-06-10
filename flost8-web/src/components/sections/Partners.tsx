import { motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { staggerParent, EASE } from '../../lib/motion'

const partners = [
  { src: '/partners/corso.jpg', alt: 'CORSO' },
  { src: '/partners/sun-crush.jpg', alt: 'Sun Crush' },
  { src: '/partners/spinner-energy-drink.jpg', alt: 'Spinner Energy Drink' },
  { src: '/partners/vibe-mount.jpg', alt: 'Vibe Mount' },
  { src: '/partners/pixels-n-pints.jpg', alt: 'Pixels N Pints' },
  { src: '/partners/soul-boner.jpg', alt: 'Soul Boner' },
  { src: '/partners/wave-mark.jpg', alt: 'Partner logo' },
  { src: '/partners/speedbay.jpg', alt: 'Speedbay' },
  { src: '/partners/reignite.jpg', alt: 'Reignite' },
  { src: '/partners/hype-bom.jpg', alt: 'Hype Bom' },
  { src: '/partners/a-mark.jpg', alt: 'Partner logo' },
  { src: '/partners/vocaine.jpg', alt: 'Vocaine' },
  { src: '/partners/traveling-bruncher.jpg', alt: 'The Traveling Bruncher' },
]

// Alternating tilt per tile, index-matched to `partners` — pinned-sticker feel
const TILTS = [-3, 2, -2.5, 3, -1.5, 2, -3, 2.5, -2, 3, -1, 2.5, -2.5]

// 3 tile sizes cycled across the wall — small / large / medium for a sticker-collage rhythm
const SIZES = [
  'w-[88px] h-[88px]',
  'w-[136px] h-[136px]',
  'w-[112px] h-[112px]',
  'w-[88px] h-[88px]',
  'w-[112px] h-[112px]',
  'w-[136px] h-[136px]',
  'w-[88px] h-[88px]',
  'w-[112px] h-[112px]',
  'w-[88px] h-[88px]',
  'w-[136px] h-[136px]',
  'w-[112px] h-[112px]',
  'w-[88px] h-[88px]',
  'w-[112px] h-[112px]',
]

// Negative-margin overlap for select tiles to create a pinned-sticker collage feel
const OVERLAPS: Record<number, string> = {
  1: '-ml-4 -mt-3',
  5: '-ml-5 -mt-2',
  9: '-ml-3 -mt-4',
}

const tile: Variants = {
  hidden: { opacity: 0, scale: 0.88, rotate: 0 },
  visible: (rotate: number) => ({
    opacity: 1,
    scale: 1,
    rotate,
    transition: { duration: 0.7, ease: EASE },
  }),
}

export default function Partners() {
  const shouldReduce = useReducedMotion()

  return (
    <section className="relative overflow-hidden bg-cream px-gutter py-section-tight">
      <div className="mx-auto max-w-[1280px]">
        <motion.p
          className="font-body italic leading-snug text-navy text-[20px] sm:text-[26px] lg:text-[30px]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.05, ease: EASE }}
        >
          Partnerships with brands, venues, festivals, and lifestyle platforms across{' '}
          <span className="font-script text-red text-2xl sm:text-3xl">14 cities</span>.
        </motion.p>

        <motion.div
          className="mx-auto mt-12 flex max-w-[300px] flex-wrap items-center justify-center gap-x-4 gap-y-8 sm:max-w-[520px] sm:gap-x-6 sm:gap-y-10 lg:mt-16 lg:max-w-[1000px] lg:gap-x-8 lg:gap-y-12"
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true }}
        >
          {partners.map((partner, i) => (
            <motion.div
              key={partner.src}
              custom={shouldReduce ? 0 : TILTS[i]}
              variants={tile}
              whileHover={shouldReduce ? undefined : { rotate: 0, scale: 1.08, y: -4 }}
              transition={{ duration: 0.3, ease: EASE }}
              className={`relative z-0 flex aspect-square items-center justify-center rounded-2xl bg-white p-2.5 shadow-card ring-1 ring-black/5 transition-shadow duration-300 hover:z-10 hover:shadow-pop hover:ring-2 hover:ring-red/35 ${SIZES[i]} ${OVERLAPS[i] ?? ''}`}
            >
              <img
                src={partner.src}
                alt={partner.alt}
                loading="lazy"
                className="h-full w-full object-contain"
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
