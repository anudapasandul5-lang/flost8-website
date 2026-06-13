import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ReactLenis } from 'lenis/react'
import CursorGlow from './components/ui/CursorGlow'
import TopNav from './components/nav/TopNav'
import MainPage from './pages/MainPage'
import BookingsPage from './pages/BookingsPage'

const PartnerPage = lazy(() => import('./pages/PartnerPage'))
const CollaboratePage = lazy(() => import('./pages/CollaboratePage'))
const JoinPage = lazy(() => import('./pages/JoinPage'))

export default function App() {
  return (
    <ReactLenis root options={{ lerp: 0.05, duration: 2.1, smoothWheel: true }}>
      <div className="grain" aria-hidden="true" />
      <CursorGlow />
      <BrowserRouter>
        <TopNav />
        <Suspense fallback={<div className="bg-base min-h-[100dvh]" />}>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/partner" element={<PartnerPage />} />
            <Route path="/collaborate" element={<CollaboratePage />} />
            <Route path="/join" element={<JoinPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ReactLenis>
  )
}
