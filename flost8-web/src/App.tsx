import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FloatingNav from './components/nav/FloatingNav'
import MainPage from './pages/MainPage'
import BookingsPage from './pages/BookingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <FloatingNav />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
