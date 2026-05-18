import Hero from '../components/sections/Hero'
import BrandStatement from '../components/sections/BrandStatement'
import Roster from '../components/sections/Roster'
import { Metrics } from '../components/sections/Metrics'
import Partners from '../components/sections/Partners'
import Services from '../components/sections/Services'
import BookingsPreview from '../components/sections/BookingsPreview'
import LivePhoto from '../components/sections/LivePhoto'
import Footer from '../components/sections/Footer'

export default function MainPage() {
  return (
    <main>
      <Hero />
      <BrandStatement />
      <Roster />
      <Metrics />
      <Partners />
      <Services />
      <BookingsPreview />
      <LivePhoto />
      <Footer />
    </main>
  )
}
