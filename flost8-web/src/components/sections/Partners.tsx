import { motion, useReducedMotion } from 'framer-motion'
import { staggerParent, fadeUp } from '../../lib/motion'

const PARTNERS = [
  { slug: 'corso', name: 'Corso' },
  { slug: 'sun_crush', name: 'Sun Crush' },
  { slug: 'spinner_energy_drink', name: 'Spinner Energy Drink' },
  { slug: 'vibe_mount', name: 'Vibe Mount' },
  { slug: 'pixels_n_pints', name: 'Pixels n Pints' },
  { slug: 'soul_boner', name: 'Soul Boner' },
  { slug: 'abstract_mark', name: 'Apex' },
  { slug: 'speedbay', name: 'Speedbay' },
  { slug: 'reignite', name: 'Reignite' },
  { slug: 'hype_bomb', name: 'Hype Bomb' },
  { slug: 'a_logo', name: 'Ascent' },
  { slug: 'vocaine', name: 'Vocaine' },
  { slug: 'traveling_bruncher', name: 'The Traveling Bruncher' },
] as const

export default function Partners() {
  const shouldReduce = useReducedMotion()

  return (
    <section className="relative bg-base py-10 md:py-14">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">
          Trusted by venues &amp; brands
        </p>

        <span className="sr-only">{PARTNERS.map((p) => p.name).join(', ')}</span>

        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-4 md:mt-12 md:gap-6"
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {PARTNERS.map((p) => (
            <motion.div
              key={p.slug}
              variants={fadeUp}
              className="group relative aspect-square w-20 overflow-hidden rounded-xl bg-base-raise transition-shadow duration-300 hover:shadow-[0_0_26px_rgba(157,20,255,0.45)] sm:w-24 md:w-28"
            >
              <img
                src={`/logos/color/${p.slug}.jpg`}
                alt={p.name}
                loading="lazy"
                className="h-full w-full object-cover opacity-55 grayscale transition-all duration-500 will-change-transform group-hover:scale-[1.05] group-hover:opacity-100 group-hover:grayscale-0"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/0 transition-colors duration-300 group-hover:ring-accent/40"
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
