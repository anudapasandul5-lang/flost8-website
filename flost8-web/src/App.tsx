import { Suspense, lazy, useEffect, useLayoutEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom'
import { ReactLenis, useLenis } from 'lenis/react'
import TopNav from './components/nav/TopNav'
import MainPage from './pages/MainPage'
import BookingsPage from './pages/BookingsPage'
import NotFound from './pages/NotFound'

const PartnerPage = lazy(() => import('./pages/PartnerPage'))
const CollaboratePage = lazy(() => import('./pages/CollaboratePage'))
const JoinPage = lazy(() => import('./pages/JoinPage'))
const ArtistPage = lazy(() => import('./pages/ArtistPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

/**
 * Per-route scroll memory. On back/forward (POP) — e.g. returning from an artist page —
 * restore the exact scroll position the user left; on forward navigation go to the top.
 * Hash nav (`/#roster` etc.) is left to MainPage's anchor effect.
 * Lives at the router root so it never unmounts and the position map survives route swaps.
 */
function ScrollRestorer() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const lenis = useLenis()
  const positions = useRef<Map<string, number>>(new Map())
  // True while we're programmatically scrolling on a route change, so the recorder
  // ignores those scroll events — otherwise the scrollTo(0) on the incoming route
  // fires a 'scroll' the OUTGOING route's still-attached listener writes as 0,
  // clobbering the saved position (which sent back-nav to the hero/top).
  const isRestoring = useRef(false)

  // useLayoutEffect runs after the whole tree commits but BEFORE paint, so the page
  // appears already at the target scroll — no visible "mount at top then jump" snap.
  useLayoutEffect(() => {
    if (window.location.hash) return
    const saved = positions.current.get(pathname)
    const target = navType === 'POP' && saved != null ? saved : 0
    isRestoring.current = true
    const apply = () => {
      lenis?.resize() // recalc after route swap so the clamp isn't stale
      if (lenis) lenis.scrollTo(target, { immediate: true })
      else window.scrollTo(0, target)
    }
    apply() // before paint
    // Re-apply after paint in case late layout (images) shifted the max scroll,
    // then release the lock a beat later so trailing programmatic scrolls are ignored.
    const raf = requestAnimationFrame(() => {
      apply()
      window.setTimeout(() => { isRestoring.current = false }, 80)
    })
    return () => cancelAnimationFrame(raf)
  }, [pathname, navType, lenis])

  // Record the current route's scroll position as the user scrolls (never during a
  // programmatic restore — see isRestoring).
  useEffect(() => {
    const save = () => { if (!isRestoring.current) positions.current.set(pathname, window.scrollY) }
    if (lenis) {
      lenis.on('scroll', save)
      return () => lenis.off('scroll', save)
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [pathname, lenis])

  return null
}

/** The public marketing nav — hidden on the standalone /admin tool. */
function SiteChrome() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/admin')) return null
  return <TopNav />
}

export default function App() {
  return (
    <ReactLenis root options={{ lerp: 0.05, duration: 2.1, smoothWheel: true }}>
      <div className="grain" aria-hidden="true" />
      <BrowserRouter>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:font-grotesk focus:text-ink"
        >
          Skip to content
        </a>
        <ScrollRestorer />
        <SiteChrome />
        <Suspense fallback={<div className="bg-base min-h-[100dvh]" />}>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/artist/:slug" element={<ArtistPage />} />
            <Route path="/partner" element={<PartnerPage />} />
            <Route path="/collaborate" element={<CollaboratePage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ReactLenis>
  )
}
