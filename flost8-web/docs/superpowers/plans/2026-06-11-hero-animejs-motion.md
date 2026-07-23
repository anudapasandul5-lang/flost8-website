# Hero Anime.js Motion Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Anime.js flourish layer to the existing video Hero — scramble→settle headline, cycling accent word, cursor-follow glow, Lenis-driven scroll-scatter, per-letter hover spring — without changing the hero's look, layout, copy, video, or CTAs.

**Architecture:** A `splitText` lib (grapheme split + scramble runner) feeds a single `useHeroMotion` hook that owns all five effects and their teardown. The hook receives refs from `Hero.tsx`. Framer-Motion keeps the kicker/sub/CTA reveals; Lenis (already mounted at app root) provides the scroll value for scatter. Everything gates on `prefers-reduced-motion` and `(pointer: fine)`.

**Tech Stack:** React 19 + TypeScript, Vite, Anime.js v4 (new), Framer-Motion (existing), Lenis (existing), Tailwind.

**Testing note:** This repo has **no test runner** (scripts: `dev`, `build = tsc -b && vite build`, `type-check`, `lint`). Adding a unit-test stack for DOM/visual animation is out of scope. Each task's verification gate is therefore `npm run type-check` (+ `npm run build` on the final task) plus a manual/agent-browser pass — not unit tests. This matches the existing codebase, which ships no tests.

**Branch:** `rebuild` (current). The working tree already holds many unrelated changes — stage ONLY the files named in each task.

---

## File Structure

- **Create** `src/lib/splitText.ts` — pure DOM helpers: `splitGraphemes(el)` (wraps each character in `<span class="char"><span class="glyph">…</span></span>`), `GLYPHS` constant, `runScramble(el, finalText, opts)` returning a stop function. No React. Single responsibility: turn text into animatable char nodes + scramble a node's text.
- **Create** `src/hooks/useHeroMotion.ts` — one hook, `useHeroMotion(refs)`, owning the five effects. Each effect is a separate `useEffect`/`useLayoutEffect` with its own cleanup. Centralizes teardown.
- **Modify** `src/components/sections/Hero.tsx` — add refs + glow element, restructure the headline markup into split-able lines + accent word, drop `useTextScramble`, call `useHeroMotion`. Keep video, grades, kicker, sub, CTAs unchanged.
- **Delete** `src/hooks/useTextScramble.ts` — superseded; only `Hero.tsx` imported it (verified by grep).
- **Modify** `package.json` — add `animejs` v4 + `@types/animejs` if anime's bundled types are insufficient (checked in Task 1).

---

## Task 1: Add the Anime.js dependency

**Files:**
- Modify: `package.json` (+ `package-lock.json`)

- [ ] **Step 1: Install anime.js v4**

Run from `flost8-web/`:
```bash
npm install animejs@^4.0.0
```

- [ ] **Step 2: Verify it resolves with types**

Create a throwaway check file `src/__anime_probe.ts`:
```ts
import { animate, stagger, utils, createAnimatable } from 'animejs'
void animate; void stagger; void utils; void createAnimatable
```
Run: `npm run type-check`
Expected: PASS (no "Cannot find module 'animejs'" or missing-types error).
If it fails with missing types, also run `npm install -D @types/animejs` and re-run. (Anime.js v4 ships its own `.d.ts`; `@types/animejs` is usually unnecessary — only add if type-check demands it.)

- [ ] **Step 3: Delete the probe file**

```bash
rm src/__anime_probe.ts
```
Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add animejs v4 dependency"
```

---

## Task 2: Create the split + scramble lib

**Files:**
- Create: `src/lib/splitText.ts`

- [ ] **Step 1: Write `src/lib/splitText.ts`**

```ts
// Pure DOM helpers for the Hero motion layer. No React, no anime.js — just
// turns text into animatable spans and scrambles a node's text content.

// Letters + a few symbols. Calm enough for the brand, with a little grit.
export const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&/·'

export interface CharNode {
  /** Outer span — owns scatter transforms (translate/rotate/opacity). */
  char: HTMLSpanElement
  /** Inner span — owns hover transforms (scale/translate). */
  glyph: HTMLSpanElement
  /** The final character this node represents (for scramble restore). */
  final: string
}

/**
 * Replaces `el`'s text with one wrapper per character:
 *   <span class="char"><span class="glyph">X</span></span>
 * Spaces are preserved as non-breaking glyphs. The outer/inner split lets
 * scatter (outer) and hover (inner) animate transforms without fighting.
 * Returns the created char nodes (visual only — keep an aria-label on a parent).
 */
export function splitGraphemes(el: HTMLElement): CharNode[] {
  const text = el.textContent ?? ''
  el.textContent = ''
  const nodes: CharNode[] = []
  for (const ch of [...text]) {
    const char = document.createElement('span')
    char.className = 'char'
    char.setAttribute('aria-hidden', 'true')
    const glyph = document.createElement('span')
    glyph.className = 'glyph'
    glyph.textContent = ch === ' ' ? ' ' : ch
    char.appendChild(glyph)
    el.appendChild(char)
    nodes.push({ char, glyph, final: ch })
  }
  return nodes
}

export interface ScrambleOptions {
  frames?: number
  speedMs?: number
  onDone?: () => void
}

/**
 * Scrambles `el`'s textContent toward `finalText` with a left-to-right reveal,
 * then sets the exact final text. Returns a stop() that clears the timer.
 * Uses textContent only (never innerHTML) — zero injection surface.
 */
export function runScramble(
  el: HTMLElement,
  finalText: string,
  { frames = 22, speedMs = 42, onDone }: ScrambleOptions = {},
): () => void {
  let frame = 0
  const id = window.setInterval(() => {
    const revealCount = Math.floor((frame / frames) * finalText.length)
    let out = ''
    for (let i = 0; i < finalText.length; i++) {
      const fc = finalText[i]
      out += fc === ' '
        ? ' '
        : i < revealCount
          ? fc
          : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    }
    el.textContent = out
    if (frame++ >= frames) {
      window.clearInterval(id)
      el.textContent = finalText
      onDone?.()
    }
  }, speedMs)
  return () => window.clearInterval(id)
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/splitText.ts
git commit -m "feat(hero): add splitText + scramble lib"
```

---

## Task 3: Create the `useHeroMotion` hook

**Files:**
- Create: `src/hooks/useHeroMotion.ts`

This hook is the heart of the feature. It splits the headline lines once (before paint), then wires five independently-cleaned-up effects. It is intentionally one file so all teardown lives together.

- [ ] **Step 1: Write `src/hooks/useHeroMotion.ts`**

```ts
import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { Lenis } from 'lenis'
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
          n.final === ' ' ? ' ' : n.final))
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
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS. (If `animate(...).revert` types complain, the v4 return type is `JSAnimation` which has `.revert()`; ensure the anime import version is v4.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useHeroMotion.ts
git commit -m "feat(hero): add useHeroMotion hook (intro, cycle, glow, scatter, hover)"
```

---

## Task 4: Wire the hook into Hero.tsx

**Files:**
- Modify: `src/components/sections/Hero.tsx`

- [ ] **Step 1: Replace the imports + add refs/hook**

Replace the top of the file (lines 1-16, the imports + the start of the component down to the existing refs) so it reads:

```tsx
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLenis } from 'lenis/react'
import { ArrowUpRight, PaperPlaneTilt } from '@phosphor-icons/react'
import { useHeroMotion } from '../../hooks/useHeroMotion'
import { staggerParentSlow, fadeUp } from '../../lib/motion'

export default function Hero() {
  const shouldReduce = useReducedMotion()
  const lenis = useLenis()

  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const line1Ref = useRef<HTMLSpanElement>(null)
  const prefixRef = useRef<HTMLSpanElement>(null)
  const wordRef = useRef<HTMLSpanElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  useHeroMotion({
    sectionRef,
    line1Ref,
    prefixRef,
    wordRef,
    glowRef,
    shouldReduce: !!shouldReduce,
    lenis,
  })
```

> Note: this removes the two `useTextScramble(...)` calls. The IntersectionObserver `useEffect` for video play/pause stays exactly as-is below this.

- [ ] **Step 2: Add the glow element**

Immediately after the two dark-grade divs (the lines with `from-base/40` and `from-base/80`), before `<div className="relative z-10 ...">`, insert:

```tsx
      {/* Cursor-follow glow — pointer/desktop only, toggled by useHeroMotion */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-[5] h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-md transition-opacity duration-300"
        style={{
          marginLeft: '-280px',
          marginTop: '-280px',
          background:
            'radial-gradient(circle, rgba(157,20,255,0.30), transparent 62%)',
        }}
      />
```

> The content wrapper is `z-10`, the glow is `z-[5]` — glow sits above grades, behind text. Keep the content `<div>`'s `z-10`.

- [ ] **Step 3: Replace the headline `<h1>`**

Replace the existing headline block:

```tsx
          <motion.h1
            variants={fadeUp}
            className="mt-4 font-display text-[72px] leading-[0.9] text-ink md:text-[112px] lg:text-[128px]"
          >
            {line1}
            <br />
            {line2}
          </motion.h1>
```

with (note: plain `<h1>`, NOT `motion.h1` — Anime.js drives it now; `aria-label` carries the real text for screen readers):

```tsx
          <h1
            aria-label="WHERE ARTISTS BECOME CULTURE"
            className="mt-4 font-display text-[72px] leading-[0.9] text-ink md:text-[112px] lg:text-[128px]"
          >
            <span ref={line1Ref}>WHERE ARTISTS</span>
            <br />
            <span ref={prefixRef}>BECOME </span>
            <span ref={wordRef} aria-hidden="true" className="text-accent">
              CULTURE
            </span>
          </h1>
```

> The surrounding `motion.div` (variants `staggerParentSlow`) and the `motion.p` kicker / `motion.p` sub / `motion.div` CTAs stay untouched — Framer still reveals them. Only the headline leaves Framer's control. The `<br/>` is preserved between line 1 and line 2.

- [ ] **Step 4: Add `will-change` for the scatter transforms (globals.css)**

In `src/styles/globals.css`, append:

```css
/* Hero headline motion layer — isolate transform work to char/glyph spans */
.headline-char,
h1 .char { will-change: transform, opacity; }
h1 .glyph { display: inline-block; will-change: transform; }
h1 .char { display: inline-block; }
```

> `splitGraphemes` adds `.char`/`.glyph` classes; these rules make them inline-block (so transforms apply) and hint the compositor. Scoped under `h1` to avoid touching anything else.

- [ ] **Step 5: Type-check**

Run: `npm run type-check`
Expected: PASS. (If TS complains that `RefObject<HTMLElement>` vs `RefObject<HTMLElement | null>` mismatches `useHeroMotion`, the hook's ref types already use `| null` — `useRef<HTMLElement>(null)` is assignable.)

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev`, open the printed localhost URL.
Expected:
- Headline "WHERE ARTISTS" scrambles then settles; "BECOME CULTURE" fades up just after.
- The accent word cycles CULTURE → SOUND → MOVEMENT → LEGEND every ~2.6s.
- Moving the cursor over the hero shows a purple glow trailing it.
- Hovering a headline letter springs it.
- Scrolling down scatters + fades the headline; scrolling back up restores it.
- Video background still plays and grades/copy/CTAs look identical to before.

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/Hero.tsx src/styles/globals.css
git commit -m "feat(hero): wire anime.js motion layer into Hero"
```

---

## Task 5: Remove the dead `useTextScramble` hook

**Files:**
- Delete: `src/hooks/useTextScramble.ts`

- [ ] **Step 1: Confirm no remaining importers**

Run: `grep -rn "useTextScramble" src/`
Expected: zero matches (Hero no longer imports it after Task 4).

- [ ] **Step 2: Delete the file**

```bash
git rm src/hooks/useTextScramble.ts
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(hero): remove superseded useTextScramble hook"
```

---

## Task 6: Full verification + reduced-motion / responsive / cross-browser pass

**Files:** none (verification only)

- [ ] **Step 1: Lint + type-check + production build**

Run: `npm run lint && npm run type-check && npm run build`
Expected: all PASS, no type errors, `dist/` produced.

- [ ] **Step 2: Reduced-motion check**

Enable OS "reduce motion" (Windows: Settings → Accessibility → Visual effects → Animation effects off), reload `npm run dev`.
Expected: headline renders static + fully visible immediately; no scramble, no cycling word (stays "CULTURE"), no glow, no scatter on scroll, no hover spring.

- [ ] **Step 3: Mobile / touch check (375px)**

In dev tools responsive mode at 375px (touch):
Expected: intro + cycling word still run; NO cursor glow, NO hover spring (pointer: coarse); scroll-scatter still works. Confirm scattered letters do not create a horizontal scrollbar (transforms can overflow — if they do, reduce the scatter X range in `useHeroMotion` `rand(-90,90)` → `rand(-50,50)`).

- [ ] **Step 4: Navigation leak check (agent-browser or manual)**

Navigate `/` → `/bookings` → back to `/` several times.
Expected: no console errors; the headline still animates correctly each return; no stacked/accelerating cycling (would indicate an interval leak). If anything stacks, confirm all `useLayoutEffect` cleanups are firing.

- [ ] **Step 5: Cross-browser**

Load the dev URL in Firefox and a WebKit browser (Safari, or `npx playwright` WebKit).
Expected: `createAnimatable` glow and Lenis scroll-scatter behave the same; no visual breakage.

- [ ] **Step 6: Confirm scope of the diff**

Run: `git diff --name-only master...HEAD`
Expected: only `package.json`, `package-lock.json`, `src/lib/splitText.ts`, `src/hooks/useHeroMotion.ts`, `src/components/sections/Hero.tsx`, `src/styles/globals.css`, and the deleted `src/hooks/useTextScramble.ts` — plus the spec/plan docs. No unrelated files.

- [ ] **Step 7 (optional): Deploy to dev for stakeholder review**

Run: `npm run deploy:dev`
Then open https://dev.flost8.pages.dev and confirm the hero on the live dev URL.

---

## Self-Review

**Spec coverage:**
- Headline scramble→settle → Task 3 intro effect + Task 4 markup. ✅
- Cycling accent word → Task 3 cycle effect. ✅
- Cursor-follow glow → Task 3 glow effect + Task 4 glow element. ✅
- Scroll-scatter (Lenis) → Task 3 scatter effect (uses `lenis.scroll`, `lenis.on('scroll')`). ✅
- Per-letter hover spring → Task 3 delegated `mouseover`. ✅
- Reduced-motion gating → every effect early-returns on `shouldReduce`; Task 6 Step 2 verifies. ✅
- Pointer-only for glow + hover → `matchMedia('(pointer: fine)')`; Task 6 Step 3 verifies. ✅
- Accessible headline (real text + aria-label, spans aria-hidden) → Task 4 Step 3 + `splitGraphemes` sets `aria-hidden`. ✅
- No metric / underline / motion-path → none present. ✅
- Video/layout/copy/CTAs unchanged → Task 4 leaves them; Task 6 Step 2/diff verifies. ✅
- Teardown (intervals, listeners, lenis off, anime revert) → every effect returns cleanup; Task 6 Step 4 verifies. ✅
- No innerHTML → `splitText.ts` and the cycle path use `textContent` / DOM nodes only. ✅
- Remove dead hook → Task 5. ✅
- type-check + build gates → Tasks + Task 6 Step 1. ✅

**Placeholder scan:** No TBD/TODO; all code is complete and concrete. ✅

**Type consistency:** `CharNode` (`char`/`glyph`/`final`) defined in `splitText.ts`, consumed identically in `useHeroMotion.ts`. `HeroMotionRefs` fields match the refs created in `Hero.tsx` (`sectionRef`, `line1Ref`, `prefixRef`, `wordRef`, `glowRef`, `shouldReduce`, `lenis`). `runScramble`/`splitGraphemes`/`GLYPHS` names consistent across files. ✅
```
