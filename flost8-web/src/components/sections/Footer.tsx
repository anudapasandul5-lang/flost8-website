import { Link } from 'react-router-dom'

// ── Data ──────────────────────────────────────────────────────────────────────

const FOOTER_COLS = [
  {
    heading: 'PLATFORM',
    links: ['The Roster', 'Shows', 'Events', 'Brand Deals'],
    hrefs: ['#roster', '#shows', '#shows', '#bookings'],
  },
  {
    heading: 'STUDIO',
    links: ['About', 'Press', 'Careers', 'Press kit'],
    hrefs: [
      '#about',
      'mailto:bookings@flost8.lk',
      'mailto:bookings@flost8.lk',
      'mailto:bookings@flost8.lk',
    ],
  },
  {
    heading: 'FOR ARTISTS',
    links: ['Join Roster', 'Bookings', 'Content'],
    hrefs: ['mailto:bookings@flost8.lk', '/bookings', 'mailto:bookings@flost8.lk'],
  },
  {
    heading: 'FOR BUYERS',
    links: ['Artists', 'Venues', 'Brands', 'Organizers'],
    hrefs: ['/bookings', '/bookings', 'mailto:bookings@flost8.lk', '/bookings'],
  },
] as const

// ── VinylLogoLarge ─────────────────────────────────────────────────────────────

function VinylLogoLarge() {
  return (
    <Link to="/">
      <img src="/logo.png" alt="FLOST8" className="h-16 w-auto" />
    </Link>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

export default function Footer() {
  return (
    <footer>
      {/* Top — navy zone */}
      <div className="bg-navy pt-16 pb-0 px-8">
        <VinylLogoLarge />
      </div>

      {/* Wave separator */}
      <div className="relative h-32 overflow-hidden bg-navy">
        <svg
          viewBox="0 0 1440 128"
          className="absolute bottom-0 w-full"
          preserveAspectRatio="none"
        >
          {/* Cyan fill wave */}
          <path
            d="M0,64 C240,110 480,20 720,64 C960,110 1200,20 1440,64 L1440,128 L0,128 Z"
            fill="#78F4F5"
          />
          {/* Coral accent line */}
          <path
            d="M0,64 C240,110 480,20 720,64 C960,110 1200,20 1440,64"
            fill="none"
            stroke="#E63946"
            strokeWidth="4"
          />
        </svg>
      </div>

      {/* Bottom — cyan zone */}
      <div className="bg-[#78F4F5] px-8 md:px-16 pt-8 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {FOOTER_COLS.map(col => (
            <div key={col.heading}>
              <h3 className="font-display text-sm text-purple uppercase tracking-widest mb-4">
                {col.heading}
              </h3>
              <ul>
                {col.links.map((label, i) => {
                  const href = col.hrefs[i]
                  const isRoute = href.startsWith('/')
                  return (
                    <li key={label}>
                      {isRoute ? (
                        <Link
                          to={href}
                          className="font-body text-sm text-purple/70 italic hover:text-purple transition-colors block mb-2"
                        >
                          {label}
                        </Link>
                      ) : (
                        <a
                          href={href}
                          className="font-body text-sm text-purple/70 italic hover:text-purple transition-colors block mb-2"
                        >
                          {label}
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="font-body text-xs text-purple/50 text-center mt-8">
          © 2026 FLOST8. All rights reserved. · flost8.lk
        </p>
      </div>
    </footer>
  )
}
