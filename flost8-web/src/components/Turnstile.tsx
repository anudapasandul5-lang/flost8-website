import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    __turnstileReady?: boolean
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
        }
      ) => string
      reset?: (id?: string) => void
      remove?: (id?: string) => void
    }
  }
}

/**
 * Explicitly renders the Cloudflare Turnstile widget.
 *
 * The api.js script is loaded in index.html with `?onload=onloadTurnstileCallback
 * &render=explicit`. That callback sets window.__turnstileReady and fires a
 * 'turnstile-ready' event once the script is fully initialized — the only safe
 * moment to call render(). Rendering earlier produces a broken widget (no iframe,
 * no token); calling turnstile.ready() earlier throws and crashes the route.
 */
export default function Turnstile({
  siteKey,
  onToken,
}: {
  siteKey: string
  onToken: (token: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    function mount() {
      if (cancelled || widgetId.current || !ref.current || !window.turnstile) return
      try {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: onToken,
          'error-callback': () => onToken(''),
          'expired-callback': () => onToken(''),
        })
      } catch {
        // never let a Turnstile failure crash the form
      }
    }

    if (window.__turnstileReady) {
      mount()
    } else {
      window.addEventListener('turnstile-ready', mount, { once: true })
    }

    return () => {
      cancelled = true
      window.removeEventListener('turnstile-ready', mount)
      if (widgetId.current) {
        window.turnstile?.remove?.(widgetId.current)
        widgetId.current = null
      }
    }
  }, [siteKey, onToken])

  return <div ref={ref} />
}
