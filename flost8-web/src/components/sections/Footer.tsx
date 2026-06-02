import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { staggerParent, fadeUp, EASE } from '../../lib/motion'

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
    <footer>
      <div className="relative h-[100px] overflow-hidden bg-navy sm:h-[140px] md:h-[190px]">
        <svg viewBox="0 0 1440 190" className="absolute bottom-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M0,82 C240,120 430,70 560,108 C700,148 730,175 820,112 C990,-8 1180,210 1440,48 L1440,190 L0,190 Z"
            fill="#70F0F2"
          />
          <motion.path
            d="M0,82 C240,120 430,70 560,108 C700,148 730,175 820,112 C990,-8 1180,210 1440,48"
            fill="none"
            stroke="#F20D0D"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.9"
            initial={shouldReduce ? { pathLength: 1 } : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1.5, ease: EASE }}
          />
        </svg>
      </div>

      <div className="bg-cyan px-8 pb-16 pt-10 md:px-16">
        <motion.div
          className="mx-auto grid max-w-[1160px] grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4 md:gap-10"
          variants={staggerParent}
          initial={shouldReduce ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {footerCols.map(col => (
            <motion.div key={`${col.heading}-${col.links[0]}`} variants={fadeUp}>
              <h3 className="mb-4 font-display text-[13px] uppercase leading-tight text-purple sm:text-[18px] md:mb-5 md:text-[28px]">{col.heading}</h3>
              <ul>
                {col.links.map((label, index) => {
                  const href = col.hrefs[index]
                  const baseClassName = 'mb-2 block font-body text-[13px] italic text-purple transition-colors hover:text-navy sm:text-[15px] md:mb-3 md:text-[17px]'
                  const innerContent = (
                    <>
                      {label}
                      <motion.span
                        className="absolute bottom-0 left-0 h-[1px] bg-current w-full origin-left"
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
                        <motion.a
                          href={href}
                          className={`${baseClassName} relative inline-block`}
                          whileHover="hover"
                        >
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
        <p className="mt-10 text-center font-body text-[14px] italic text-purple/70">
          © 2026 FLOST8. All rights reserved. · flost8.lk
        </p>
      </div>
    </footer>
  )
}
