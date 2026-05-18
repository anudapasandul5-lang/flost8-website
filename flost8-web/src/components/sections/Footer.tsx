import { Link } from 'react-router-dom'

const footerCols = [
  { heading: 'PLATFORM', links: ['The Roster', 'Content Feed', 'Events', 'Brand Deals'], hrefs: ['#roster', '#shows', '/bookings', 'mailto:bookings@flost8.lk'] },
  { heading: 'STUDIO', links: ['About', 'Press', 'Careers', 'Press kit'], hrefs: ['#about', 'mailto:bookings@flost8.lk', 'mailto:bookings@flost8.lk', 'mailto:bookings@flost8.lk'] },
  { heading: 'FOR YOU', links: ['Artists', 'Venues', 'Brands', 'Organizers'], hrefs: ['/bookings', '/bookings', 'mailto:bookings@flost8.lk', '/bookings'] },
  { heading: 'FOR YOU', links: ['Artists', 'Venues', 'Brands', 'Organizers'], hrefs: ['/bookings', '/bookings', 'mailto:bookings@flost8.lk', '/bookings'] },
] as const

export default function Footer() {
  return (
    <footer>
      <div className="bg-navy px-6 pb-0 pt-8 sm:px-12 md:px-[96px]">
        <img src="/logo-transparent.png" alt="FLOST8" className="h-[150px] w-auto" />
      </div>

      <div className="relative h-[100px] overflow-hidden bg-navy sm:h-[140px] md:h-[190px]">
        <svg viewBox="0 0 1440 190" className="absolute bottom-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M0,82 C240,120 430,70 560,108 C700,148 730,175 820,112 C990,-8 1180,210 1440,48 L1440,190 L0,190 Z"
            fill="#70F0F2"
          />
          <path
            d="M0,82 C240,120 430,70 560,108 C700,148 730,175 820,112 C990,-8 1180,210 1440,48"
            fill="none"
            stroke="#F20D0D"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      </div>

      <div className="bg-cyan px-8 pb-16 pt-10 md:px-16">
        <div className="mx-auto grid max-w-[1160px] grid-cols-2 gap-10 md:grid-cols-4">
          {footerCols.map(col => (
            <div key={`${col.heading}-${col.links[0]}`}>
              <h3 className="mb-5 font-display text-[22px] uppercase leading-none text-purple sm:text-[28px] md:text-[32px]">{col.heading}</h3>
              <ul>
                {col.links.map((label, index) => {
                  const href = col.hrefs[index]
                  const className = 'mb-3 block font-body text-[17px] italic text-purple transition-colors hover:text-navy'
                  return (
                    <li key={label}>
                      {href.startsWith('/') ? (
                        <Link to={href} className={className}>
                          {label}
                        </Link>
                      ) : (
                        <a href={href} className={className}>
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
      </div>
    </footer>
  )
}
