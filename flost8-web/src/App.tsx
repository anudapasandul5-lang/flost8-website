import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ReactLenis } from 'lenis/react'
import TopNav from './components/nav/TopNav'
import MainPage from './pages/MainPage'
import BookingsPage from './pages/BookingsPage'

export default function App() {
  return (
    <ReactLenis root options={{ lerp: 0.05, duration: 2.1, smoothWheel: true }}>
      <div className="grain" aria-hidden="true" />
      <BrowserRouter>
        <TopNav />
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
        </Routes>
      </BrowserRouter>
    </ReactLenis>
  )
}
