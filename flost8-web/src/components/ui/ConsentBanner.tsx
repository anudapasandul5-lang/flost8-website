import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { OPEN_SETTINGS_EVENT, POSTHOG_KEY, getConsent, initAnalytics, isPrivatePath, setConsent } from '../../lib/analytics'

const BTN =
  'min-h-[44px] rounded-full px-5 font-grotesk text-sm font-semibold uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink'

/** Asks once before any analytics runs. Hidden until a PostHog key exists and on the staff tools. */
export default function ConsentBanner() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(() => POSTHOG_KEY !== '' && getConsent() === null)

  useEffect(() => {
    initAnalytics()
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen)
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen)
  }, [])

  if (!open || !POSTHOG_KEY || isPrivatePath(pathname)) return null

  const choose = (v: 'granted' | 'denied') => {
    setConsent(v)
    setOpen(false)
  }

  return (
    <div
      role="region"
      aria-label="Analytics consent"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-[720px] rounded-2xl border border-white/10 bg-base-raise p-5 shadow-2xl md:inset-x-6 md:bottom-6"
    >
      <p className="font-grotesk text-sm text-[var(--ink-72)]">
        We use analytics to see which pages and buttons get used, so we can improve flost8.lk. It stays anonymous and
        never touches what you type into a form. Okay with that?
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => choose('granted')} className={`${BTN} bg-accent text-ink hover:bg-accent-ink hover:text-base`}>
          Allow
        </button>
        <button type="button" onClick={() => choose('denied')} className={`${BTN} border border-white/25 text-ink hover:bg-white/10`}>
          No thanks
        </button>
      </div>
    </div>
  )
}
