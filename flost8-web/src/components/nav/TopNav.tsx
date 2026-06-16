import { useState } from 'react'
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { List, X, ArrowUpRight } from '@phosphor-icons/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLenis } from 'lenis/react'
import { NAV_LINKS } from '../../lib/config'
import { EASE, lenisEase } from '../../lib/motion'
import { useMotionSafe } from '../../hooks/useMotionSafe'

function useMobileMenu() {
  const [open, setOpen] = useState(false)
  return { open, toggle: () => setOpen(v => !v), close: () => setOpen(false) }
}

// Stagger variants for mobile menu items
const menuContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
}

const menuItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2, ease: EASE } },
}

function NavLink({
  label,
  href,
  onClick,
  reduce,
  active,
  onHashNav,
}: {
  label: string
  href: string
  onClick?: () => void
  reduce: boolean
  active?: boolean
  onHashNav?: (e: React.MouseEvent<HTMLAnchorElement>, href: string, afterClick?: () => void) => void
}) {
  const isRoute = href.startsWith('/') && !href.startsWith('/#')

  const content = (
    <span className="group relative inline-block py-1">
      <span
        className={`font-grotesk text-[14px] font-medium tracking-wide transition-colors duration-[200ms] ${
          active ? 'text-ink' : 'text-[var(--ink-72)] group-hover:text-ink'
        }`}
      >
        {label}
      </span>
      {/* Underline — persistent when active, hover-reveal otherwise */}
      <motion.span
        aria-hidden="true"
        className="absolute -bottom-0.5 left-0 right-0 h-px origin-left bg-accent"
        initial={false}
        animate={{ scaleX: active ? 1 : 0 }}
        whileHover={{ scaleX: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE }}
      />
    </span>
  )

  return isRoute ? (
    <Link to={href} onClick={onClick} aria-label={label}>
      {content}
    </Link>
  ) : (
    <a href={href} onClick={onHashNav ? (e) => onHashNav(e, href, onClick) : onClick} aria-label={label}>
      {content}
    </a>
  )
}

function BookPill({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      to="/bookings"
      onClick={onClick}
      className="edge-refract accent-press inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 font-grotesk text-[13px] font-semibold tracking-wide text-ink"
      aria-label="Book"
    >
      Book
      <span className="inline-flex items-center justify-center rounded-full bg-ink/15 p-0.5">
        <ArrowUpRight size={12} weight="bold" />
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
  const navigate = useNavigate()
  const lenis = useLenis()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20)
  })

  function handleHashNav(e: React.MouseEvent<HTMLAnchorElement>, href: string, afterClick?: () => void) {
    e.preventDefault()
    const id = href.split('#')[1]
    afterClick?.()
    if (location.pathname === '/') {
      const el = document.getElementById(id)
      if (el && lenis) {
        lenis.scrollTo(el, reduce ? { immediate: true } : { offset: -70, duration: 1.6, easing: lenisEase })
        navigate('/#' + id, { replace: true })
      } else {
        navigate('/#' + id)
      }
    } else {
      navigate('/#' + id)
    }
  }

  // Determine active link: match on hash (home) or full pathname (routes)
  function isActive(href: string) {
    if (href.startsWith('/#')) {
      return location.pathname === '/' && location.hash === href.slice(1)
    }
    return location.pathname === href
  }

  // Only text links — Book becomes the pill
  const textLinks = NAV_LINKS.filter(link => link.href !== '/bookings')

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 h-[68px] transition-[background-color,backdrop-filter,border-color] duration-[250ms]"
      style={{
        ...(scrolled
          ? { borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(18,9,23,0.82)', backdropFilter: 'blur(20px)' }
          : { borderBottom: '1px solid transparent', backgroundColor: 'transparent' }),
        ...(reduce ? { transition: 'none' } : {}),
      }}
    >
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6 md:px-10">
        {/* Logo — subtle scale on scroll (GPU-only transform) */}
        <Link
          to="/"
          aria-label="FLOST8 home"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center shrink-0"
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault()
              lenis?.scrollTo(0, { duration: 1.8 })
            }
          }}
        >
          <motion.img
            src="/logo-transparent.png"
            alt="FLOST8"
            className="h-[34px] w-auto"
            animate={reduce ? {} : { scale: scrolled ? 0.92 : 1 }}
            transition={{ duration: 0.25, ease: EASE }}
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {textLinks.map(link => (
            <NavLink
              key={link.label}
              {...link}
              reduce={reduce}
              active={isActive(link.href)}
              onHashNav={handleHashNav}
            />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Desktop Book pill */}
          <div className="hidden md:block">
            <BookPill />
          </div>

          {/* Mobile hamburger — single close affordance (no duplicate X in menu) */}
          <button
            type="button"
            className="accent-press inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-ink md:hidden"
            onClick={toggle}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 45, opacity: 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.18, ease: EASE }}
                >
                  <X size={22} />
                </motion.span>
              ) : (
                <motion.span
                  key="open"
                  initial={{ rotate: 45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -45, opacity: 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.18, ease: EASE }}
                >
                  <List size={22} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile menu — fixed overlay, NOT a child of any backdrop-filter ancestor */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
            className="fixed inset-x-0 top-0 z-40 flex h-[100dvh] flex-col bg-[var(--bg)] px-6 pt-[80px] md:hidden"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <motion.nav
              className="flex flex-col gap-5 pt-4"
              variants={reduce ? {} : menuContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-label="Mobile"
            >
              {textLinks.map(link => {
                const isRoute = link.href.startsWith('/') && !link.href.startsWith('/#')
                const linkClass =
                  'font-display text-[clamp(2rem,10vw,3.25rem)] uppercase leading-[0.9] tracking-wide text-ink transition-colors duration-150 hover:text-accent'
                return (
                  <motion.div key={link.label} variants={reduce ? {} : menuItemVariants}>
                    {isRoute ? (
                      <Link to={link.href} onClick={close} className={linkClass}>
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} onClick={(e) => handleHashNav(e, link.href, close)} className={linkClass}>
                        {link.label}
                      </a>
                    )}
                  </motion.div>
                )
              })}
            </motion.nav>

            <motion.div
              className="mt-8"
              variants={reduce ? {} : menuItemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={reduce ? {} : { delay: textLinks.length * 0.07 + 0.08 }}
            >
              {/* Mobile pill — same compact size as desktop, not oversized */}
              <Link
                to="/bookings"
                onClick={close}
                className="edge-refract accent-press inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-grotesk text-[15px] font-semibold tracking-wide text-ink"
                aria-label="Book"
              >
                Book a show
                <span className="inline-flex items-center justify-center rounded-full bg-ink/15 p-1">
                  <ArrowUpRight size={14} weight="bold" />
                </span>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
