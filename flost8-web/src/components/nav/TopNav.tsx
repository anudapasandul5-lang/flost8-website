import { useState } from 'react'
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { List, X, ArrowUpRight } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router-dom'
import { useLenis } from 'lenis/react'
import { NAV_LINKS } from '../../lib/config'
import { EASE } from '../../lib/motion'
import { useMotionSafe } from '../../hooks/useMotionSafe'

function useMobileMenu() {
  const [open, setOpen] = useState(false)
  return { open, toggle: () => setOpen(v => !v), close: () => setOpen(false) }
}

function NavLink({
  label,
  href,
  onClick,
  reduce,
}: {
  label: string
  href: string
  onClick?: () => void
  reduce: boolean
}) {
  const isRoute = href.startsWith('/') && !href.startsWith('/#')

  const content = (
    <span className="group relative inline-block py-1">
      <span className="font-grotesk text-[15px] text-[var(--ink-72)] transition-colors duration-[450ms] group-hover:text-ink">
        {label}
      </span>
      <motion.span
        aria-hidden="true"
        className="absolute -bottom-0.5 left-0 right-0 h-px origin-left bg-accent"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.45, ease: EASE }}
      />
    </span>
  )

  return isRoute ? (
    <Link to={href} onClick={onClick} aria-label={label}>
      {content}
    </Link>
  ) : (
    <a href={href} onClick={onClick} aria-label={label}>
      {content}
    </a>
  )
}

function BookPill({ onClick, large = false }: { onClick?: () => void; large?: boolean }) {
  return (
    <Link
      to="/bookings"
      onClick={onClick}
      className={`edge-refract accent-press inline-flex items-center gap-2 rounded-full bg-accent font-grotesk text-ink transition-transform ${
        large ? 'px-7 py-4 text-lg' : 'px-5 py-2.5 text-[15px]'
      }`}
      aria-label="Book"
    >
      Book
      <span className="inline-flex items-center justify-center rounded-full bg-ink/15 p-1">
        <ArrowUpRight size={large ? 18 : 14} weight="bold" />
      </span>
    </Link>
  )
}

export default function TopNav() {
  const { open, toggle, close } = useMobileMenu()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const { reduce } = useMotionSafe()
  const location = useLocation()
  const lenis = useLenis()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20)
  })

  // Render only the text-link items (skip the Book link — it becomes the pill)
  const textLinks = NAV_LINKS.filter(link => link.href !== '/bookings')

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,height,border-color] duration-[450ms] ${
        scrolled
          ? 'h-[60px] border-b border-white/10 bg-base/80 backdrop-blur-xl'
          : 'h-[68px] border-b border-transparent bg-transparent'
      }`}
      style={reduce ? { transition: 'none' } : undefined}
    >
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6 md:px-10">
        <Link
          to="/"
          aria-label="FLOST8 home"
          className="shrink-0"
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault()
              lenis?.scrollTo(0, { duration: 1.8 })
            }
          }}
        >
          <img src="/logo-transparent.png" alt="FLOST8" className="h-[34px] w-auto" />
        </Link>

        <nav className="hidden items-center gap-9 md:flex" aria-label="Primary">
          {textLinks.map(link => (
            <NavLink key={link.label} {...link} reduce={reduce} />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <BookPill />
          </div>
          <button
            type="button"
            className="accent-press inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-ink md:hidden"
            onClick={toggle}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
            className="fixed inset-x-0 top-0 z-40 h-[100dvh] flex flex-col bg-base px-6 pt-[88px] backdrop-blur-xl md:hidden"
          >
            <Link
              to="/"
              onClick={close}
              aria-label="Close menu and go to home"
              className="accent-press absolute right-6 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-ink"
            >
              <X size={26} />
            </Link>
            <nav className="flex flex-col gap-6" aria-label="Mobile">
              {textLinks.map(link => {
                const isRoute = link.href.startsWith('/') && !link.href.startsWith('/#')
                const className = 'font-display text-5xl uppercase leading-[0.92] text-ink transition-colors hover:text-accent'
                return isRoute ? (
                  <Link key={link.label} to={link.href} onClick={close} className={className}>
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.label} href={link.href} onClick={close} className={className}>
                    {link.label}
                  </a>
                )
              })}
            </nav>
            <div className="mt-10">
              <BookPill onClick={close} large />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
