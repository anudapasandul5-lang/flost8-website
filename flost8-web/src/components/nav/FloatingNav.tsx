import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { List, X } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { NAV_LINKS } from '../../lib/config'

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useScrolled(threshold = 80): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

function useMobileMenu() {
  const [open, setOpen] = useState(false)
  return { open, toggle: () => setOpen(v => !v), close: () => setOpen(false) }
}

// ── VinylLogo ─────────────────────────────────────────────────────────────────

function VinylLogo() {
  return (
    <Link to="/" className="flex items-center gap-0 leading-none">
      <span className="font-display text-2xl text-purple tracking-wider">fl</span>
      <svg
        viewBox="0 0 24 24"
        className="inline-block w-6 h-6 align-middle mx-0.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="11" fill="#7B3FF5" stroke="#78F4F5" strokeWidth="1" />
        <circle cx="12" cy="12" r="7" fill="none" stroke="#78F4F5" strokeWidth="0.5" />
        <circle cx="12" cy="12" r="3" fill="none" stroke="#78F4F5" strokeWidth="0.5" />
        <circle cx="12" cy="12" r="1.5" fill="#78F4F5" />
      </svg>
      <span className="font-display text-2xl text-cyan tracking-wider">st8</span>
    </Link>
  )
}

// ── FloatingNav ───────────────────────────────────────────────────────────────

export default function FloatingNav() {
  const scrolled = useScrolled()
  const { open, toggle, close } = useMobileMenu()

  return (
    <div className="fixed top-4 left-0 right-0 z-50 px-4 md:px-8">
      {/* Pill */}
      <motion.div
        className={[
          'max-w-6xl mx-auto rounded-full px-6 py-3',
          'flex items-center justify-between',
          scrolled ? 'border border-white/10' : 'border border-transparent',
        ].join(' ')}
        animate={{
          backgroundColor: scrolled ? 'rgba(26,21,53,0.85)' : 'rgba(0,0,0,0)',
          backdropFilter: scrolled ? 'blur(12px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Logo */}
        <VinylLogo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ label, href }) =>
            href.startsWith('/') ? (
              <Link
                key={label}
                to={href}
                className="font-body text-sm font-medium tracking-wide text-white/80 hover:text-white relative group transition-colors"
              >
                {label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-cyan transition-all duration-200 group-hover:w-full" />
              </Link>
            ) : (
              <a
                key={label}
                href={href}
                className="font-body text-sm font-medium tracking-wide text-white/80 hover:text-white relative group transition-colors"
              >
                {label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-cyan transition-all duration-200 group-hover:w-full" />
              </a>
            )
          )}
        </nav>

        {/* Desktop CTA + Mobile hamburger */}
        <div className="flex items-center gap-3">
          <Link
            to="/bookings"
            className="hidden md:inline-flex bg-red rounded-full px-4 py-1.5 text-white text-sm font-medium font-body hover:bg-red/90 transition-colors"
          >
            Book Now
          </Link>

          <button
            type="button"
            className="md:hidden text-white p-1"
            onClick={toggle}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
      </motion.div>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden max-w-6xl mx-auto mt-2 rounded-2xl border border-white/10"
            style={{ backgroundColor: 'rgba(26,21,53,0.95)', backdropFilter: 'blur(12px)' }}
          >
            <nav className="flex flex-col px-6 py-4 gap-4">
              {NAV_LINKS.map(({ label, href }) =>
                href.startsWith('/') ? (
                  <Link
                    key={label}
                    to={href}
                    onClick={close}
                    className="font-body text-base font-medium tracking-wide text-white/80 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                ) : (
                  <a
                    key={label}
                    href={href}
                    onClick={close}
                    className="font-body text-base font-medium tracking-wide text-white/80 hover:text-white transition-colors"
                  >
                    {label}
                  </a>
                )
              )}
              <Link
                to="/bookings"
                onClick={close}
                className="mt-2 inline-flex justify-center bg-red rounded-full px-4 py-2 text-white text-sm font-medium font-body hover:bg-red/90 transition-colors"
              >
                Book Now
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
