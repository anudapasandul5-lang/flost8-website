import { useState } from 'react'
import { AnimatePresence, motion, useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion'
import { List, X } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_LINKS } from '../../lib/config'

function useMobileMenu() {
  const [open, setOpen] = useState(false)
  return { open, toggle: () => setOpen(v => !v), close: () => setOpen(false) }
}

function NavLink({
  label,
  href,
  onClick,
  isActive,
}: {
  label: string
  href: string
  onClick?: () => void
  isActive?: boolean
}) {
  const isRoute = href.startsWith('/')
  const className =
    'relative font-body text-[17px] leading-none text-white hover:text-cyan transition-colors py-1'

  const indicator = isActive ? (
    <motion.span
      layoutId="nav-indicator"
      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-cyan"
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
    />
  ) : null

  return isRoute ? (
    <Link to={href} onClick={onClick} className={className}>
      {label}
      {indicator}
    </Link>
  ) : (
    <a href={href} onClick={onClick} className={className}>
      {label}
      {indicator}
    </a>
  )
}

export default function FloatingNav() {
  const { open, toggle, close } = useMobileMenu()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const shouldReduce = useReducedMotion()
  const location = useLocation()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    if (shouldReduce) return
    setScrolled(latest > 20)
  })

  // Active detection: match pathname + hash against each link href
  const currentPath = location.pathname + location.hash

  function isLinkActive(href: string): boolean {
    if (href === '/bookings') return location.pathname === '/bookings'
    // Hash links: e.g. /#roster — match when on / with matching hash
    return currentPath === href || (href === '/' && location.pathname === '/' && !location.hash)
  }

  const baseStyle: React.CSSProperties = {
    background: scrolled ? 'rgba(48, 42, 102, 0.88)' : 'rgba(48, 42, 102, 0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: scrolled
      ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.35)'
      : 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.15)',
    transition: shouldReduce ? 'none' : 'box-shadow 0.3s ease, background 0.3s ease',
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className="h-[68px] rounded-b-[34px] px-6 md:px-10 flex items-center justify-between"
        style={baseStyle}
      >
        <Link to="/" aria-label="FLOST8 home" className="shrink-0">
          <img src="/logo-transparent.png" alt="FLOST8" className="h-[42px] w-auto max-w-[130px]" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.label}
              {...link}
              isActive={isLinkActive(link.href)}
            />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden rounded-full border border-cyan/70 p-3 text-cyan"
            onClick={toggle}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="mx-4 mt-3 rounded-[28px] p-6 shadow-xl md:hidden"
            style={{
              background: 'rgba(48, 42, 102, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <nav className="flex flex-col gap-5">
              {NAV_LINKS.map(link => (
                <NavLink key={link.label} {...link} onClick={close} />
              ))}
              <Link
                to="/bookings"
                onClick={close}
                className="inline-flex justify-center rounded-full border-2 border-purple bg-cyan px-6 py-3 font-body italic text-lg text-navy"
              >
                Book Now
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
