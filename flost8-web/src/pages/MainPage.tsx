import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLenis } from 'lenis/react'
import Hero from '../components/sections/Hero'
import BrandStatement from '../components/sections/BrandStatement'
import Roster from '../components/sections/Roster'
import { Metrics } from '../components/sections/Metrics'
import Partners from '../components/sections/Partners'
import WhatWeDo from '../components/sections/WhatWeDo'
import Services from '../components/sections/Services'
import BookingsPreview from '../components/sections/BookingsPreview'
import LivePhoto from '../components/sections/LivePhoto'
import Footer from '../components/sections/Footer'

export default function MainPage() {
  const { hash } = useLocation()
  const lenis = useLenis()

  useEffect(() => {
    if (!hash || !lenis) return
    const el = document.querySelector(hash)
    if (el) lenis.scrollTo(el as HTMLElement, { offset: -80 })
  }, [hash, lenis])

  return (
    <main className="bg-navy pt-[68px]">
      <Hero />
      <BrandStatement />
      <Roster />
      <Metrics />
      <Partners />
      <WhatWeDo />
      <Services />
      <BookingsPreview />
      <LivePhoto />
      <Footer />
    </main>
  )
}
