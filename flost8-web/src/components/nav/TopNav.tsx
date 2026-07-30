import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { List, X } from '@phosphor-icons/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLenis } from 'lenis/react'
import { NAV_LINKS } from '../../lib/config'
import { EASE, lenisEase } from '../../lib/motion'
import { useMotionSafe } from '../../hooks/useMotionSafe'

function useMobileMenu() {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen(v => !v), [])
  const close = useCallback(() => setOpen(false), [])
  return { open, toggle, close }
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
        className={`font-grotesk uppercase text-[11px] md:text-[12px] font-medium tracking-[0.18em] transition-colors duration-[200ms] ${
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
    <Link to={href} onClick={onClick} className="rounded-sm outline-none touch-manipulation focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#120917]">
      {content}
    </Link>
  ) : (
    <a href={href} onClick={onHashNav ? (e) => onHashNav(e, href, onClick) : onClick} className="rounded-sm outline-none touch-manipulation focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#120917]">
      {content}
    </a>
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
  const menuRef = useRef<HTMLDivElement>(null)
  // Scroll-spy: which homepage section is currently in view (drives the active underline).
  const [activeSection, setActiveSection] = useState('')

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20)
  })

  // Scroll-spy — track the section crossing the viewport's mid-band so the nav
  // underline follows where the user is (homepage only).
  useEffect(() => {
    // No spy targets off the homepage. Nothing to clear either — the only reader of
    // activeSection already gates on pathname === '/', so a stale value is never shown.
    if (location.pathname !== '/') return
    const ids = ['roster', 'about', 'shows']
    const els = ids.map(id => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (top) setActiveSection(top.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.5, 1] },
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [location.pathname])

  // §12: when the mobile menu is open, trap focus inside it, close on Escape,
  // lock the page behind it, and restore focus to the trigger on close.
  useEffect(() => {
    if (!open) return
    const overlay = menuRef.current
    const prevFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    lenis?.stop()

    const focusables = () =>
      overlay
        ? Array.from(
            overlay.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
          )
        : []
    focusables()[0]?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      lenis?.start()
      prevFocused?.focus?.()
    }
  }, [open, close, lenis])

  function handleHashNav(e: React.MouseEvent<HTMLAnchorElement>, href: string, afterClick?: () => void) {
    e.preventDefault()
    const id = href.split('#')[1]
    afterClick?.()
    if (location.pathname === '/') {
      const el = document.getElementById(id)
      if (el && lenis) {
        lenis.start() // mobile menu close() stops lenis; scrollTo below would no-op if still stopped
        lenis.scrollTo(el, reduce ? { immediate: true } : { offset: -70, duration: 1.6, easing: lenisEase })
        // Scroll-spy (activeSection) drives the active underline, not the URL hash —
        // so keep the URL clean instead of leaving #about stuck in the bar.
        window.history.replaceState(null, '', '/')
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
      // Driven by scroll-spy, so the underline follows the section in view.
      return location.pathname === '/' && activeSection === href.slice(2)
    }
    return location.pathname === href
  }

  // All nav items render identically — Book included, no standout pill.
  const textLinks = NAV_LINKS

  // Left side: Roster + What We Do; Right side: Shows + Book
  const leftLinks = textLinks.slice(0, 2)
  const rightLinks = textLinks.slice(2)

  return (
    <motion.header
      className="fixed inset-x-0 top-3 md:top-4 z-50 flex justify-center px-4 pointer-events-none"
      initial={reduce ? false : { y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 100, damping: 20 }}
    >
      {/* Floating glass pill */}
      <div
        className={`pointer-events-auto relative z-50 w-full max-w-[680px] rounded-full backdrop-blur-xl backdrop-saturate-150 bg-[#120917]/55 ${
          reduce ? '' : 'transition-shadow duration-300'
        }`}
        style={{
          // Thin 0.5px-ish hairline ring (was edge-refract's 1px @0.10) + lighter float shadow.
          boxShadow: scrolled
            ? 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 10px 34px -14px rgba(0,0,0,0.6)'
            : 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 6px 22px -14px rgba(0,0,0,0.45)',
        }}
      >
        {/* Desktop layout — logo dead-center via CSS grid */}
        <nav aria-label="Primary" className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2 pl-6 pr-2">
          {/* LEFT: Roster + What We Do */}
          <div className="flex items-center justify-end gap-6">
            {leftLinks.map(link => (
              <NavLink
                key={link.label}
                {...link}
                reduce={reduce}
                active={isActive(link.href)}
                onHashNav={handleHashNav}
              />
            ))}
          </div>

          {/* CENTER: Logo */}
          <Link
            to="/"
            aria-label="FLOST8 home"
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
              width={514}
              height={555}
              className="h-[26px] w-auto max-w-[120px] object-contain"
              animate={reduce ? {} : { scale: scrolled ? 0.94 : 1 }}
              transition={{ duration: 0.25, ease: EASE }}
            />
          </Link>

          {/* RIGHT: Shows + Book pill */}
          <div className="flex items-center justify-start gap-6">
            {rightLinks.map(link => (
              <NavLink
                key={link.label}
                {...link}
                reduce={reduce}
                active={isActive(link.href)}
                onHashNav={handleHashNav}
              />
            ))}
          </div>
        </nav>

        {/* Mobile layout */}
        <div className="flex md:hidden items-center justify-between py-2 pl-5 pr-2 w-full">
          {/* Logo */}
          <Link
            to="/"
            aria-label="FLOST8 home"
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
              width={514}
              height={555}
              className="h-[26px] w-auto max-w-[120px] object-contain"
              animate={reduce ? {} : { scale: scrolled ? 0.94 : 1 }}
              transition={{ duration: 0.25, ease: EASE }}
            />
          </Link>

          {/* Hamburger */}
          <button
            type="button"
            className="accent-press inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-ink touch-manipulation outline-none transition-colors duration-200 hover:border-white/25 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#120917]"
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
                  <X size={22} aria-hidden="true" />
                </motion.span>
              ) : (
                <motion.span
                  key="open"
                  initial={{ rotate: 45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -45, opacity: 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.18, ease: EASE }}
                >
                  <List size={22} aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile overlay menu — sibling of pill, NOT nested inside the blurred pill */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
            className="pointer-events-auto fixed inset-x-0 top-0 z-40 flex h-[100dvh] flex-col overscroll-contain bg-[var(--bg)] px-6 pt-[80px] pb-[env(safe-area-inset-bottom)] md:hidden"
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
