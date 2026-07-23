import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
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

/** Reset scroll to top on route change (hash nav is handled by MainPage's anchor effect). */
function ScrollToTop() {
  const { pathname } = useLocation()
  const lenis = useLenis()
  useEffect(() => {
    if (window.location.hash) return
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
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
        <ScrollToTop />
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
