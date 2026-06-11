import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { InstagramLogo } from '@phosphor-icons/react'
import { staggerParent, fadeUp } from '../../lib/motion'

const footerCols = [
  {
    heading: 'PLATFORM',
    links: ['The Roster', 'Upcoming Shows', 'Book an Artist', 'Brand Deals'],
    hrefs: ['#roster', '#shows', '/bookings', 'mailto:bookings@flost8.lk'],
  },
  {
    heading: 'FOR ARTISTS',
    links: ['Join the Roster', 'Content Engine', 'Brand Partnerships', 'Booking Support'],
    hrefs: ['mailto:bookings@flost8.lk', 'mailto:bookings@flost8.lk', 'mailto:bookings@flost8.lk', '/bookings'],
  },
  {
    heading: 'FOR VENUES & EVENTS',
    links: ['Curated Lineups', 'B2B / B3B Sets', 'Content Coverage', 'Promotion Support'],
    hrefs: ['/bookings', '/bookings', 'mailto:bookings@flost8.lk', 'mailto:bookings@flost8.lk'],
  },
  {
    heading: 'FOR BRANDS',
    links: ['Direct Access to DJs', 'Product Placement', 'Lifestyle Integration', 'Content With Reach'],
    hrefs: ['mailto:bookings@flost8.lk', 'mailto:bookings@flost8.lk', 'mailto:bookings@flost8.lk', 'mailto:bookings@flost8.lk'],
  },
] as const

const linkUnderlineVariants = {
  initial: { scaleX: 0 },
  hover: { scaleX: 1, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
}

export default function Footer() {
  const shouldReduce = useReducedMotion()

  return (
    <footer className="relative bg-base border-t border-white/10">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-24">
        <h2 className="font-display text-ink text-7xl md:text-9xl leading-none">
          FLOST8<span className="text-accent">.</span>
        </h2>
      </div>

      <motion.div
        className="mx-auto grid max-w-[1400px] grid-cols-2 gap-8 px-6 py-16 md:grid-cols-4 md:px-10"
        variants={staggerParent}
        initial={shouldReduce ? 'visible' : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {footerCols.map(col => (
          <motion.div key={`${col.heading}-${col.links[0]}`} variants={fadeUp}>
            <h3 className="mb-4 font-display text-xl uppercase text-ink">{col.heading}</h3>
            <ul>
              {col.links.map((label, index) => {
                const href = col.hrefs[index]
                const baseClassName =
                  'mb-2 block font-grotesk text-sm text-[var(--ink-50)] transition-colors hover:text-ink'
                const innerContent = (
                  <>
                    {label}
                    <motion.span
                      className="absolute bottom-0 left-0 h-px w-full origin-left bg-accent"
                      variants={linkUnderlineVariants}
                      initial="initial"
                    />
                  </>
                )
                return (
                  <li key={label}>
                    {href.startsWith('/') ? (
                      <motion.div whileHover="hover" className="inline-block">
                        <Link to={href} className={`${baseClassName} relative inline-block`}>
                          {innerContent}
                        </Link>
                      </motion.div>
                    ) : (
                      <motion.a href={href} className={`${baseClassName} relative inline-block`} whileHover="hover">
                        {innerContent}
                      </motion.a>
                    )}
                  </li>
                )
              })}
            </ul>
          </motion.div>
        ))}
      </motion.div>

      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-4 border-t border-white/10 px-6 py-10 md:px-10">
        <a
          href="https://www.instagram.com/flost8.lk/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="FLOST8 on Instagram"
          className="text-[var(--ink-72)] transition-colors hover:text-accent-ink"
        >
          <InstagramLogo size={28} weight="bold" />
        </a>
        <p className="text-center font-grotesk text-sm text-[var(--ink-32)]">
          © 2026 FLOST8. All rights reserved. · flost8.lk
        </p>
      </div>
    </footer>
  )
}
