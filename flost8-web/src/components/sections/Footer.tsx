import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { InstagramLogo, YoutubeLogo, FacebookLogo, TiktokLogo } from '@phosphor-icons/react'

const socialLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com/flost8.lk/', Icon: InstagramLogo },
  { label: 'YouTube', href: 'https://youtube.com/@flost8lk', Icon: YoutubeLogo },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61592980643003&mibextid=wwXIfr&mibextid=wwXIfr',
    Icon: FacebookLogo,
  },
  { label: 'TikTok', href: 'https://www.tiktok.com/@flost8.lk', Icon: TiktokLogo },
] as const

const footerCols = [
  {
    heading: 'PLATFORM',
    links: ['The Roster', 'Upcoming Shows', 'Book an Artist', 'Collaborations'],
    hrefs: ['/#roster', '/#shows', '/bookings', '/collaborate'],
  },
  {
    heading: 'FOR ARTISTS',
    links: ['Join the Roster', 'Content Engine', 'Booking Support'],
    hrefs: ['/join', '/#about', '/bookings'],
  },
  {
    heading: 'FOR VENUES & EVENTS',
    links: ['Curated Lineups', 'B2B / B3B Sets', 'Content Coverage'],
    hrefs: ['/bookings', '/bookings', '/partner'],
  },
  {
    heading: 'FOR BRANDS & PARTNERS',
    links: ['Direct Access', 'Product Placement', 'Lifestyle Integration'],
    hrefs: ['/partner', '/partner', '/partner'],
  },
] as const

const linkUnderlineVariants = {
  initial: { scaleX: 0 },
  hover: { scaleX: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
}

export default function Footer() {
  return (
    <footer className="relative bg-base border-t border-white/10">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-24">
        <img
          src="/logo-transparent.png"
          alt="FLOST8"
          width={514}
          height={555}
          className="h-36 w-auto object-contain md:h-56"
        />
      </div>

      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-8 px-6 py-16 md:grid-cols-4 md:px-10">
        {footerCols.map(col => (
          <div key={`${col.heading}-${col.links[0]}`}>
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
                        <Link to={href} className={`${baseClassName} relative inline-flex min-h-[44px] items-center`}>
                          {innerContent}
                        </Link>
                      </motion.div>
                    ) : (
                      <motion.a href={href} className={`${baseClassName} relative inline-flex min-h-[44px] items-center`} whileHover="hover">
                        {innerContent}
                      </motion.a>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-4 border-t border-white/10 px-6 py-10 md:px-10">
        <div className="flex items-center gap-6">
          {socialLinks.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`FLOST8 on ${label}`}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--ink-72)] transition-colors hover:text-accent-ink"
            >
              <Icon size={28} weight="bold" />
            </a>
          ))}
        </div>
        <p className="text-center font-grotesk text-sm text-[var(--ink-32)]">
          © 2026 FLOST8. All rights reserved. · flost8.lk
        </p>
      </div>
    </footer>
  )
}
