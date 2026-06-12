import { useLayoutEffect, useRef, type RefObject } from 'react'
import type Lenis from 'lenis'
import { animate } from 'animejs'
import { splitGraphemes, type CharNode } from '../lib/splitText'
import { useMotionSafe } from './useMotionSafe'

export interface HeroMotionRefs {
  /** The <section> root — bounds for cursor glow + scatter progress. */
  sectionRef: RefObject<HTMLElement | null>
  /** "WHERE ARTISTS" line. */
  line1Ref: RefObject<HTMLSpanElement | null>
  /** "BECOME " prefix (static). */
  prefixRef: RefObject<HTMLSpanElement | null>
  /** The accent word that cycles ("CULTURE" → …). */
  wordRef: RefObject<HTMLSpanElement | null>
  /** From useLenis(); may be null until mounted. */
  lenis: Lenis | null | undefined
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function seedScatter(
  nodes: CharNode[],
  map: WeakMap<HTMLElement, { x: number; y: number; r: number }>,
) {
  for (const n of nodes) {
    map.set(n.char, { x: rand(-90, 90), y: rand(-140, 70), r: rand(-45, 45) })
  }
}

export function useHeroMotion({ sectionRef, line1Ref, prefixRef, wordRef, lenis }: HeroMotionRefs) {
  const { reduce, guard } = useMotionSafe()

  // Char nodes shared across effects. Filled in the layout effect below.
  const line1Chars = useRef<CharNode[]>([])
  // All split char nodes (line1 + prefix + word), used by the scramble effect.
  const allChars = useRef<CharNode[]>([])
  // Per-char scatter offsets keyed by the (outer) .char element, so they
  // survive the cycling word re-splitting its spans.
  const scatterOffsets = useRef(new WeakMap<HTMLElement, { x: number; y: number; r: number }>())
  // Guards against StrictMode's double-invoke of mount effects re-splitting
  // (and double-wrapping) already-split DOM.
  const didSplit = useRef(false)

  // ---- Split lines into char/glyph spans (runs exactly once, before paint) ----
  // Must NOT be keyed on `reduce` — splitGraphemes mutates the DOM, and a live
  // reduced-motion toggle re-running it would double-wrap and garble the text.
  useLayoutEffect(() => {
    const line1 = line1Ref.current
    const prefix = prefixRef.current
    const word = wordRef.current
    if (!line1 || !prefix || !word) return
    if (didSplit.current) return
    didSplit.current = true

    line1Chars.current = splitGraphemes(line1)
    const prefixChars = splitGraphemes(prefix)
    const wordChars = splitGraphemes(word)
    const all = [...line1Chars.current, ...prefixChars, ...wordChars]
    seedScatter(all, scatterOffsets.current)
    for (const n of all) n.glyph.style.opacity = '1'
    allChars.current = all
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Scramble-in intro (snap to final text when reduced) ----
  useLayoutEffect(() => {
    const all = allChars.current
    if (all.length === 0) return

    if (reduce) {
      // eslint-disable-next-line react-hooks/immutability -- DOM node mutation, not React state
      for (const n of all) n.glyph.textContent = n.final === ' ' ? ' ' : n.final
      return
    }

    return guard(() => {
      const GLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&/'
      let frame = 0
      const frames = 22
      const intervalId = window.setInterval(() => {
        const revealCount = Math.floor((frame / frames) * all.length)
        all.forEach((n, i) => {
          if (n.final === ' ') {
            n.glyph.textContent = ' '
            return
          }
          n.glyph.textContent =
            i < revealCount ? n.final : GLY[Math.floor(Math.random() * GLY.length)]
        })
        if (frame++ >= frames) {
          window.clearInterval(intervalId)
          all.forEach((n) => (n.glyph.textContent = n.final === ' ' ? ' ' : n.final))
        }
      }, 42)

      return () => window.clearInterval(intervalId)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce])

  // ---- Scroll-scatter exit (Lenis-driven) ----
  useLayoutEffect(() => {
    if (reduce || !lenis) return
    const hero = sectionRef.current
    if (!hero) return

    let ticking = false
    let rafId = 0
    const apply = () => {
      const p = Math.min(Math.max(lenis.scroll / (hero.offsetHeight * 0.7), 0), 1)
      const chars = hero.querySelectorAll<HTMLElement>('.char')
      chars.forEach((c) => {
        const o = scatterOffsets.current.get(c) ?? { x: 0, y: 0, r: 0 }
        c.style.transform = `translate(${o.x * p}px, ${o.y * p}px) rotate(${o.r * p}deg)`
        c.style.opacity = String(1 - p)
      })
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(apply)
        ticking = true
      }
    }
    lenis.on('scroll', onScroll)
    apply() // set initial state for non-zero scroll (refresh mid-page)
    return () => {
      lenis.off('scroll', onScroll)
      cancelAnimationFrame(rafId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, lenis])

  // ---- Per-letter hover spring (delegated so it survives word rebuilds) ----
  useLayoutEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const hero = sectionRef.current
    if (!hero) return

    return guard(() => {
      const onOver = (e: Event) => {
        const t = e.target as HTMLElement
        if (!t.classList?.contains('glyph')) return
        animate(t, { y: [-12, 0], scale: [1.35, 1], duration: 600, ease: 'outElastic(1, .4)' })
      }
      hero.addEventListener('mouseover', onOver)
      return () => hero.removeEventListener('mouseover', onOver)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce])
}
