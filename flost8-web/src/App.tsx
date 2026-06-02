import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ReactLenis } from 'lenis/react'
import FloatingNav from './components/nav/FloatingNav'
import MainPage from './pages/MainPage'
import BookingsPage from './pages/BookingsPage'

export default function App() {
  return (
    <ReactLenis root options={{ lerp: 0.08, duration: 1.4, smoothWheel: true }}>
      <BrowserRouter>
        <FloatingNav />
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
        </Routes>
      </BrowserRouter>
    </ReactLenis>
  )
}
