import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLenis } from 'lenis/react'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { lenisEase } from '../lib/motion'
import Hero from '../components/sections/Hero'
import Roster from '../components/sections/Roster'
import Shows from '../components/sections/Shows'
import JoinRoster from '../components/sections/JoinRoster'
import Services from '../components/sections/Services'
import { Metrics } from '../components/sections/Metrics'
import Partners from '../components/sections/Partners'
import Footer from '../components/sections/Footer'
import ScrollFadeSection from '../components/ui/ScrollFadeSection'

export default function MainPage() {
  const { hash } = useLocation()
  const lenis = useLenis()
  const { reduce } = useMotionSafe()

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
        lenis.scrollTo(el as HTMLElement, reduce ? { immediate: true } : { offset: -70, duration: 1.6, easing: lenisEase })
        // Strip the hash so it doesn't stick in the URL after the jump (doesn't re-navigate).
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        return
      }
      if (tries++ < 20) raf = requestAnimationFrame(run)
    }
    // double rAF: let the fresh route mount + paint before measuring
    raf = requestAnimationFrame(() => { raf = requestAnimationFrame(run) })
    return () => cancelAnimationFrame(raf)
  }, [hash, lenis, reduce])

  return (
    <main id="main-content" tabIndex={-1} className="bg-base outline-none">
      <Hero />
      <Partners />
      <Roster />
      <Services />
      <ScrollFadeSection><Metrics /></ScrollFadeSection>
      <ScrollFadeSection><Shows /></ScrollFadeSection>
      <ScrollFadeSection><JoinRoster /></ScrollFadeSection>
      <ScrollFadeSection noFadeOut><Footer /></ScrollFadeSection>
    </main>
  )
}
