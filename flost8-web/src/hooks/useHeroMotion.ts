import { useLayoutEffect, useRef, type RefObject } from 'react'
import type Lenis from 'lenis'
import { animate, stagger, createAnimatable } from 'animejs'
import { splitGraphemes, runScramble, type CharNode } from '../lib/splitText'

export interface HeroMotionRefs {
  /** The <section> root — bounds for cursor glow + scatter progress. */
  sectionRef: RefObject<HTMLElement | null>
  /** "WHERE ARTISTS" line. */
  line1Ref: RefObject<HTMLSpanElement | null>
  /** "BECOME " prefix (static). */
  prefixRef: RefObject<HTMLSpanElement | null>
  /** The accent word that cycles ("CULTURE" → …). */
  wordRef: RefObject<HTMLSpanElement | null>
  /** The radial glow element. */
  glowRef: RefObject<HTMLDivElement | null>
  /** From useReducedMotion(). */
  shouldReduce: boolean
  /** From useLenis(); may be null until mounted. */
  lenis: Lenis | null | undefined
}

const CYCLE_WORDS = ['CULTURE', 'SOUND', 'MOVEMENT', 'LEGEND']
const CYCLE_MS = 2600

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function useHeroMotion({
  sectionRef,
  line1Ref,
  prefixRef,
  wordRef,
  glowRef,
  shouldReduce,
  lenis,
}: HeroMotionRefs) {
  // Char nodes shared across effects. Filled in the layout effect below.
  const line1Chars = useRef<CharNode[]>([])
  const allHeadlineChars = useRef<CharNode[]>([])
  // Per-char scatter offsets, seeded once.
  const offsets = useRef<{ x: number; y: number; r: number }[]>([])

  // ---- Split lines + intro (runs once, before paint to avoid a flash) ----
  useLayoutEffect(() => {
    const line1 = line1Ref.current
    const prefix = prefixRef.current
    const word = wordRef.current
    if (!line1 || !prefix || !word) return

    line1Chars.current = splitGraphemes(line1)
    const prefixChars = splitGraphemes(prefix)
    const wordChars = splitGraphemes(word)
    allHeadlineChars.current = [
      ...line1Chars.current,
      ...prefixChars,
      ...wordChars,
    ]
    offsets.current = allHeadlineChars.current.map(() => ({
      x: rand(-90, 90),
      y: rand(-140, 70),
      r: rand(-45, 45),
    }))

    if (shouldReduce) {
      // Static, fully visible. No animation.
      for (const n of allHeadlineChars.current) n.glyph.style.opacity = '1'
      return
    }

    // Hide line 2 until its fade; line 1 will scramble (stays visible).
    for (const n of prefixChars) n.glyph.style.opacity = '0'
    for (const n of wordChars) n.glyph.style.opacity = '0'

    const finals = line1Chars.current.map((n) => n.final)
    let frame = 0
    const frames = 20
    const intervalId = window.setInterval(() => {
      const revealCount = Math.floor((frame / frames) * finals.length)
      line1Chars.current.forEach((n, i) => {
        n.glyph.style.opacity = '1'
        if (n.final === ' ') return
        n.glyph.textContent =
          i < revealCount
            ? finals[i]
            : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
      })
      if (frame++ >= frames) {
        window.clearInterval(intervalId)
        line1Chars.current.forEach((n) => (n.glyph.textContent =
          n.final === ' ' ? ' ' : n.final))
        animate(
          line1Chars.current.map((n) => n.glyph),
          { y: [18, 0], opacity: [0.4, 1], duration: 560, delay: stagger(26), ease: 'outExpo' },
        )
      }
    }, 42)

    const line2Anim = animate(
      [...prefixChars, ...wordChars].map((n) => n.glyph),
      { y: [24, 0], opacity: [0, 1], duration: 600, delay: 600, ease: 'outExpo' },
    )

    return () => {
      window.clearInterval(intervalId)
      line2Anim.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReduce])

  // ---- Cycling accent word ----
  useLayoutEffect(() => {
    if (shouldReduce) return
    const word = wordRef.current
    if (!word) return
    let wi = 0
    let stopScramble: (() => void) | null = null

    const tick = () => {
      wi = (wi + 1) % CYCLE_WORDS.length
      const target = CYCLE_WORDS[wi]
      stopScramble?.()
      // Scramble the live word text, then re-split so hover binding stays valid.
      stopScramble = runScramble(word, target, {
        frames: 16,
        speedMs: 38,
        onDone: () => {
          splitGraphemes(word) // rebuild char/glyph spans for the new word
        },
      })
    }
    const id = window.setInterval(tick, CYCLE_MS)
    return () => {
      window.clearInterval(id)
      stopScramble?.()
    }
  }, [shouldReduce])

  // ---- Cursor-follow glow ----
  useLayoutEffect(() => {
    if (shouldReduce) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    const hero = sectionRef.current
    const glow = glowRef.current
    if (!hero || !glow) return

    const movable = createAnimatable(glow, { x: 0, y: 0, duration: 500, ease: 'out(3)' })
    const onEnter = () => (glow.style.opacity = '1')
    const onLeave = () => (glow.style.opacity = '0')
    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect()
      movable.x(e.clientX - r.left)
      movable.y(e.clientY - r.top)
    }
    hero.addEventListener('mouseenter', onEnter)
    hero.addEventListener('mouseleave', onLeave)
    hero.addEventListener('mousemove', onMove)
    return () => {
      hero.removeEventListener('mouseenter', onEnter)
      hero.removeEventListener('mouseleave', onLeave)
      hero.removeEventListener('mousemove', onMove)
      movable.revert()
    }
  }, [shouldReduce])

  // ---- Scroll-scatter exit (Lenis-driven) ----
  useLayoutEffect(() => {
    if (shouldReduce || !lenis) return
    const hero = sectionRef.current
    if (!hero) return

    let ticking = false
    const apply = () => {
      const p = Math.min(Math.max(lenis.scroll / (hero.offsetHeight * 0.7), 0), 1)
      allHeadlineChars.current.forEach((n, i) => {
        const o = offsets.current[i] ?? { x: 0, y: 0, r: 0 }
        n.char.style.transform = `translate(${o.x * p}px, ${o.y * p}px) rotate(${o.r * p}deg)`
        n.char.style.opacity = String(1 - p)
      })
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(apply)
        ticking = true
      }
    }
    lenis.on('scroll', onScroll)
    apply() // set initial state for non-zero scroll (refresh mid-page)
    return () => {
      lenis.off('scroll', onScroll)
    }
  }, [shouldReduce, lenis])

  // ---- Per-letter hover spring (delegated so it survives word rebuilds) ----
  useLayoutEffect(() => {
    if (shouldReduce) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    const hero = sectionRef.current
    if (!hero) return
    const onOver = (e: Event) => {
      const t = e.target as HTMLElement
      if (!t.classList?.contains('glyph')) return
      animate(t, { y: [-12, 0], scale: [1.35, 1], duration: 600, ease: 'outElastic(1, .4)' })
    }
    hero.addEventListener('mouseover', onOver)
    return () => hero.removeEventListener('mouseover', onOver)
  }, [shouldReduce])
}
