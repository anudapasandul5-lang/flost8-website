import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { List, X } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { NAV_LINKS } from '../../lib/config'

function useMobileMenu() {
  const [open, setOpen] = useState(false)
  return { open, toggle: () => setOpen(v => !v), close: () => setOpen(false) }
}

function NavLink({ label, href, onClick }: { label: string; href: string; onClick?: () => void }) {
  const isRoute = href.startsWith('/')
  const className = 'font-body text-[17px] leading-none text-white hover:text-cyan transition-colors'

  return isRoute ? (
    <Link to={href} onClick={onClick} className={className}>
      {label}
    </Link>
  ) : (
    <a href={href} onClick={onClick} className={className}>
      {label}
    </a>
  )
}

export default function FloatingNav() {
  const { open, toggle, close } = useMobileMenu()

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="h-[68px] rounded-b-[34px] bg-navy px-6 md:px-10 flex items-center justify-between shadow-sm">
        <Link to="/" aria-label="FLOST8 home" className="shrink-0">
          <img src="/logo-transparent.png" alt="FLOST8" className="h-[42px] w-auto max-w-[130px]" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(link => (
            <NavLink key={link.label} {...link} />
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
            className="mx-4 mt-3 rounded-[28px] bg-navy p-6 shadow-xl md:hidden"
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
