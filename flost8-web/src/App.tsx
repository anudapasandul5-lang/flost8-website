import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ReactLenis, useLenis } from 'lenis/react'
import TopNav from './components/nav/TopNav'
import MainPage from './pages/MainPage'
import BookingsPage from './pages/BookingsPage'

const PartnerPage = lazy(() => import('./pages/PartnerPage'))
const CollaboratePage = lazy(() => import('./pages/CollaboratePage'))
const JoinPage = lazy(() => import('./pages/JoinPage'))
const ArtistPage = lazy(() => import('./pages/ArtistPage'))

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

export default function App() {
  return (
    <ReactLenis root options={{ lerp: 0.05, duration: 2.1, smoothWheel: true }}>
      <div className="grain" aria-hidden="true" />
      <BrowserRouter>
        <ScrollToTop />
        <TopNav />
        <Suspense fallback={<div className="bg-base min-h-[100dvh]" />}>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/artist/:slug" element={<ArtistPage />} />
            <Route path="/partner" element={<PartnerPage />} />
            <Route path="/collaborate" element={<CollaboratePage />} />
            <Route path="/join" element={<JoinPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ReactLenis>
  )
}
