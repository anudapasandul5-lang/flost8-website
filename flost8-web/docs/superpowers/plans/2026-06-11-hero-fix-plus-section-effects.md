# Hero Fix + Section Effects — Implementation Plan

> Execute via superpowers:subagent-driven-development. No test runner in repo → acceptance gates are `npm run type-check`, `npx eslint <files>`, `npm run build`, + agent-browser visual check. Stage ONLY each task's files (branch `rebuild` is dirty).

**Goal:** (1) Fix the Hero headline (scramble-only, no fade, correct word spacing); (2) add three section effects driven by the user's approved demos: number count-up (Metrics), grid-stagger-from-center (Partners), eyebrow underline draw (section eyebrows).

**Design authority:** Chosen under `design-taste-frontend` (MOTION 6 = fluid transform/opacity, scroll-triggers via framer `useInView` — NEVER `window.addEventListener('scroll')`; hardware-accelerated transform/opacity only). Brand override: FLOST8 single electric-purple `#9D14FF` is deliberate (the skill's "purple ban" does NOT apply). All effects gated by `prefers-reduced-motion`.

**Stack:** React 19 + TS + Vite, anime.js v4, framer-motion (useInView triggers + existing reveals), Lenis, Tailwind.

---

## Task A: Hero — scramble-only + word-spacing fix

**Files:** Modify `src/lib/splitText.ts`, `src/hooks/useHeroMotion.ts`.

Decisions:
- **Spacing bug:** inline-block glyph spans collapse whitespace → "WHEREARTISTS". Fix in `splitGraphemes`: render space chars as a non-breaking space so inline-block keeps width.
- **Scramble only:** remove the per-letter rise + opacity fade (`line1SettleAnim`, `line2Anim`). The whole headline (line1 + prefix + word) scrambles in to final text, glyphs always `opacity: 1`. Keep glow, scroll-scatter, hover spring untouched.

- [ ] **Step 1 — splitText space fix.** In `src/lib/splitText.ts`, change the glyph text assignment so spaces don't collapse:
```ts
    glyph.textContent = ch === ' ' ? ' ' : ch
```
(`final` stays the literal `ch` incl. `' '` — scramble compares on `' '`.)

- [ ] **Step 2 — rewrite the intro effect** in `src/hooks/useHeroMotion.ts`. Replace the entire first `useLayoutEffect` (split + intro) body so it: splits all three spans, seeds scatter, sets every glyph `opacity:'1'`, and (when not reduced) runs ONE scramble pass over ALL headline chars to their finals — no `animate()` calls, no hidden line2. Concretely the non-reduced branch becomes:
```ts
    line1Chars.current = splitGraphemes(line1)
    const prefixChars = splitGraphemes(prefix)
    const wordChars = splitGraphemes(word)
    const all = [...line1Chars.current, ...prefixChars, ...wordChars]
    seedScatter(all, scatterOffsets.current)
    for (const n of all) n.glyph.style.opacity = '1'

    if (shouldReduce) {
      for (const n of all) n.glyph.textContent = n.final === ' ' ? ' ' : n.final
      return
    }

    const GLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&/'
    let frame = 0
    const frames = 22
    const intervalId = window.setInterval(() => {
      const revealCount = Math.floor((frame / frames) * all.length)
      all.forEach((n, i) => {
        if (n.final === ' ') { n.glyph.textContent = ' '; return }
        n.glyph.textContent = i < revealCount ? n.final : GLY[Math.floor(Math.random() * GLY.length)]
      })
      if (frame++ >= frames) {
        window.clearInterval(intervalId)
        all.forEach((n) => (n.glyph.textContent = n.final === ' ' ? ' ' : n.final))
      }
    }, 42)

    return () => window.clearInterval(intervalId)
```
Remove the now-unused `stagger` import if nothing else uses it (the scatter/glow/hover effects don't — verify; `animate` is still used by hover, `createAnimatable` by glow). After edit, `stagger` is unused → drop it from the `animejs` import.

- [ ] **Step 3 — verify + commit.** `npm run type-check` (PASS), `npx eslint src/hooks/useHeroMotion.ts src/lib/splitText.ts` (0 issues), then commit (`src/lib/splitText.ts`, `src/hooks/useHeroMotion.ts`): `fix(hero): scramble-only headline + non-collapsing word spacing`.

---

## Task B: Metrics number count-up

**Files:** Create `src/hooks/useCountUp.ts`; modify `src/components/sections/Metrics.tsx`.

Decisions: count 0→value once when the stats grid enters view, via framer `useInView` (no window scroll) + anime `animate` driving a numeric onUpdate. Values are currently `'00'` strings → parse the leading integer; non-numeric/zero just renders the number statically. Reduced-motion → show final value immediately.

- [ ] **Step 1 — create `src/hooks/useCountUp.ts`:**
```ts
import { useEffect, useRef, useState } from 'react'
import { animate, utils } from 'animejs'

/** Counts 0 → `target` once `active` flips true. Reduced-motion shows target instantly. */
export function useCountUp(target: number, active: boolean, reduce: boolean): number {
  const [n, setN] = useState(0)
  const done = useRef(false)
  useEffect(() => {
    if (!active || done.current) return
    done.current = true
    if (reduce || target === 0) { setN(target); return }
    const obj = { v: 0 }
    const anim = animate(obj, {
      v: target, duration: 1600, ease: 'outExpo',
      onUpdate: () => setN(utils.round(obj.v, 0)),
    })
    return () => anim.revert()
  }, [active, target, reduce])
  return n
}
```

- [ ] **Step 2 — wire Metrics.** In `src/components/sections/Metrics.tsx`: import `useRef`, `useInView` from `framer-motion`, and `useCountUp`. Add a ref on the grid `motion.div` and `const inView = useInView(gridRef, { once: true, margin: '-80px' })`. Extract each stat number into a tiny `<Counter>` leaf so hooks aren't called in a loop in the parent:
```tsx
function Counter({ value, reduce, active }: { value: string; reduce: boolean; active: boolean }) {
  const target = parseInt(value, 10) || 0
  const n = useCountUp(target, active, reduce)
  // preserve a leading-zero look for placeholders ('00') until real data lands
  const text = value.length >= 2 && target < 10 ? String(n).padStart(value.length, '0') : String(n)
  return <>{text}</>
}
```
Replace `{stat.value}` with `<Counter value={stat.value} reduce={!!shouldReduce} active={inView} />`. Keep the `<span className="text-accent">+</span>` and all classes/layout unchanged.

- [ ] **Step 3 — verify + commit** (`src/hooks/useCountUp.ts`, `src/components/sections/Metrics.tsx`): type-check, eslint 0, commit `feat(metrics): scroll-triggered number count-up`.

---

## Task C: Partners grid-stagger from center

**Files:** Modify `src/components/sections/Partners.tsx`.

Decisions: replace the framer `staggerChildren`/`fadeUp` reveal with an anime.js center-out ripple fired once on `useInView`. Keep all tile markup/hover styling. `stagger(55, { from: 'center' })` (index-based from center — robust across the responsive flex-wrap; no fixed grid dims needed). transform/opacity only.

- [ ] **Step 1 — rewrite the reveal.** In `src/components/sections/Partners.tsx`:
  - Remove `partnersStagger` variants and the `variants`/`initial`/`whileInView` props on the wrapper and the `variants={fadeUp}` on each tile (drop the `fadeUp` import if now unused; `motion` may also become unused — if so convert the wrapper + tiles to plain `<div>` and remove the framer import entirely).
  - Add `import { useRef, useEffect } from 'react'`, `import { useReducedMotion, useInView } from 'framer-motion'` (keep `useReducedMotion`; `useInView` for the trigger), `import { animate, stagger } from 'animejs'`.
  - Wrapper gets `ref={gridRef}`; tiles get `className="partner-tile ..."` (add `partner-tile`). Seed initial hidden state inline so there's no flash: each tile style `opacity: shouldReduce ? 1 : 0`.
  - Effect:
```tsx
  const gridRef = useRef<HTMLDivElement>(null)
  const inView = useInView(gridRef, { once: true, margin: '-60px' })
  useEffect(() => {
    if (shouldReduce || !inView || !gridRef.current) return
    const anim = animate(gridRef.current.querySelectorAll('.partner-tile'), {
      opacity: [0, 1], scale: [0.6, 1],
      duration: 650, ease: 'outBack',
      delay: stagger(55, { from: 'center' }),
    })
    return () => anim.revert()
  }, [inView, shouldReduce])
```
  - Tile base style: add `will-change-transform`. Keep existing hover classes.

- [ ] **Step 2 — verify + commit** (`src/components/sections/Partners.tsx`): type-check, eslint 0, commit `feat(partners): center-out grid stagger reveal`.

---

## Task D: Eyebrow underline draw

**Files:** Create `src/components/ui/EyebrowRule.tsx`; modify `Roster.tsx`, `Partners.tsx`, `SoundEthos.tsx`, `WhatWeDo.tsx`.

Decisions: a small self-contained component placed directly AFTER an eyebrow `<p>` (does NOT replace it — avoids disturbing each section's existing framer wrappers). A 1px purple SVG line draws left→right once on `useInView`. Reduced-motion → shown fully drawn.

- [ ] **Step 1 — create `src/components/ui/EyebrowRule.tsx`:**
```tsx
import { useEffect, useRef } from 'react'
import { useReducedMotion, useInView } from 'framer-motion'
import { animate } from 'animejs'

/** Hairline purple rule that inks itself L→R when scrolled into view. */
export default function EyebrowRule({ width = 56 }: { width?: number }) {
  const shouldReduce = useReducedMotion()
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const pathRef = useRef<SVGLineElement>(null)

  useEffect(() => {
    const line = pathRef.current
    if (!line) return
    const len = width
    line.style.strokeDasharray = String(len)
    line.style.strokeDashoffset = shouldReduce ? '0' : String(len)
    if (shouldReduce || !inView) return
    const anim = animate(line, { strokeDashoffset: [len, 0], duration: 700, ease: 'inOutQuad' })
    return () => anim.revert()
  }, [inView, shouldReduce, width])

  return (
    <svg ref={ref} width={width} height="2" viewBox={`0 0 ${width} 2`} aria-hidden="true" className="mt-2 block">
      <line ref={pathRef} x1="0" y1="1" x2={width} y2="1" stroke="var(--accent, #9D14FF)" strokeWidth="1.5" />
    </svg>
  )
}
```

- [ ] **Step 2 — drop it under four eyebrows.** In each of `Roster.tsx`, `Partners.tsx`, `SoundEthos.tsx`, `WhatWeDo.tsx`, import `EyebrowRule` and insert `<EyebrowRule />` immediately after the eyebrow `<p className="font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink">…</p>`. If the eyebrow `<p>` is a `motion.p` inside a stagger parent, place `<EyebrowRule />` as the next sibling (still inside the same parent is fine). Do NOT alter the eyebrow text or other markup.

- [ ] **Step 3 — verify + commit** (`EyebrowRule.tsx` + the 4 sections): type-check, eslint 0, commit `feat(sections): eyebrow underline draw-on`.

---

## Final verification
- `npm run lint && npm run type-check && npm run build` (build clean).
- `npm run dev` + agent-browser: Hero words spaced correctly ("WHERE ARTISTS" / "BECOME CULTURE" with gaps), headline scrambles with no fade, glow/scatter/hover still work. Metrics counts on scroll-in (0→value; '00' shows 0). Partners logos ripple from center. Eyebrow rules draw under labels.
- Reduced-motion: headline static + spaced, counts show final, logos static, rules fully drawn.
- 375px: no horizontal scroll; effects degrade cleanly.
- `git diff --name-only d6903b1..HEAD` shows only feature files.
