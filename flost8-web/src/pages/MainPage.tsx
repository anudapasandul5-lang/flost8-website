import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLenis } from 'lenis/react'
import Hero from '../components/sections/Hero'
import Roster from '../components/sections/Roster'
import Shows from '../components/sections/Shows'
import SoundEthos from '../components/sections/SoundEthos'
import WhatWeDo from '../components/sections/WhatWeDo'
import Services from '../components/sections/Services'
import { Metrics } from '../components/sections/Metrics'
import Partners from '../components/sections/Partners'
import LivePhoto from '../components/sections/LivePhoto'
import BookingsPreview from '../components/sections/BookingsPreview'
import Footer from '../components/sections/Footer'
import ScrollFadeSection from '../components/ui/ScrollFadeSection'

export default function MainPage() {
  const { hash } = useLocation()
  const lenis = useLenis()

  useEffect(() => {
    // guard: bare/invalid hash ("#") makes querySelector throw — skip
    if (!hash || hash.length < 2 || !lenis) return
    let raf = 0
    let tries = 0
    const run = () => {
      let el: Element | null = null
      try { el = document.querySelector(hash) } catch { return }
      if (el) {
        lenis.resize() // recalc dimensions after route swap — fixes stale clamp
        lenis.scrollTo(el as HTMLElement, { offset: -70 })
        return
      }
      if (tries++ < 20) raf = requestAnimationFrame(run)
    }
    // double rAF: let the fresh route mount + paint before measuring
    raf = requestAnimationFrame(() => { raf = requestAnimationFrame(run) })
    return () => cancelAnimationFrame(raf)
  }, [hash, lenis])

  return (
    <main className="bg-base">
      <Hero />
      <Partners />
      <ScrollFadeSection><Roster /></ScrollFadeSection>
      <ScrollFadeSection><Shows /></ScrollFadeSection>
      <ScrollFadeSection><SoundEthos /></ScrollFadeSection>
      <ScrollFadeSection><WhatWeDo /></ScrollFadeSection>
      <ScrollFadeSection><Services /></ScrollFadeSection>
      <ScrollFadeSection><Metrics /></ScrollFadeSection>
      <ScrollFadeSection><LivePhoto /></ScrollFadeSection>
      <ScrollFadeSection><BookingsPreview /></ScrollFadeSection>
      <ScrollFadeSection noFadeOut><Footer /></ScrollFadeSection>
    </main>
  )
}
