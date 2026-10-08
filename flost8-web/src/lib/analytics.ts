import type { PostHog } from 'posthog-js'

// PostHog loads only after the visitor says yes (and only when a key is set at build time),
// so the site stays exactly as it was until both are true. The key is a public project key.
export const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY ?? ''
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com'
const CONSENT_KEY = 'flost8-analytics-consent'
export const OPEN_SETTINGS_EVENT = 'flost8:cookie-settings'

export type Consent = 'granted' | 'denied'

let ph: PostHog | null = null
let starting: Promise<void> | null = null

/** The private staff tools are never tracked. */
export function isPrivatePath(path: string): boolean {
  return /^\/(admin|manage)(\/|$)/.test(path)
}

export function getConsent(): Consent | null {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

function start(): Promise<void> {
  if (!POSTHOG_KEY) return Promise.resolve()
  starting ??= import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        defaults: '2025-05-24', // SPA page views on route change
        person_profiles: 'identified_only', // anonymous visitors, no profiles
        respect_dnt: true,
        disable_session_recording: true,
        capture_exceptions: true, // uncaught errors + unhandled promise rejections
        // Clicks on links and buttons only: never form-field changes or typed text.
        autocapture: { dom_event_allowlist: ['click'], element_allowlist: ['a', 'button'] },
        before_send: e => (e && isPrivatePath(window.location.pathname) ? null : e),
      })
      ph = posthog
    })
    .catch(() => { starting = null }) // blocked or offline: the site works the same
  return starting
}

/** Call once on page load: resumes tracking for visitors who already agreed. */
export function initAnalytics(): void {
  if (getConsent() === 'granted' && !isPrivatePath(window.location.pathname)) void start() // /manage's CSP would block it anyway
}

export function setConsent(value: Consent): void {
  try { window.localStorage.setItem(CONSENT_KEY, value) } catch { /* private mode: asked again next visit */ }
  if (value === 'granted') {
    void start().then(() => ph?.opt_in_capturing())
  } else {
    ph?.opt_out_capturing()
    ph?.reset()
  }
}

/** One named event, e.g. a form that went through. No-op until the visitor has agreed. */
export function track(event: string, props?: Record<string, string | number | boolean>): void {
  ph?.capture(event, props)
}
