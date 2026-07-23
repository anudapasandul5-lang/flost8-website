# Hero Anime.js Motion Layer — Design

**Date:** 2026-06-11
**Branch:** rebuild
**Status:** Approved (design), pending spec review → plan

## Context

The FLOST8 homepage Hero (`src/components/sections/Hero.tsx`) currently uses a video background,
Framer-Motion reveals, and a hand-rolled `useTextScramble` hook for the headline. The team wants to
add a richer, on-brand motion layer using **Anime.js** (newly added dependency) for the effects
Framer-Motion is weak at — scramble, per-letter choreography, cursor-reactive glow, and scroll-scrub
scatter. This is an **additive flourish layer**: the original look, video background, layout, copy,
and CTAs are unchanged. No metrics/count-up, no underline draw, no motion-path dot (explicitly cut
during brainstorming). Validated against a live preview the user approved ("perfect").

Anime.js docs reference: `wiki/sources/lenis-complete-reference.md` sibling
`wiki/sources/animejs-v4-complete-reference.md` in the Obsidian vault.

## Goals

1. Headline reveals with **scramble → per-letter settle** (keeps the scramble identity, adds polish).
2. The accent word in "BECOME ___" **cycles**: CULTURE → SOUND → MOVEMENT → LEGEND, on a loop.
3. **Cursor-follow glow**: a soft purple radial light trails the pointer across the hero.
4. **Scroll-scatter exit**: headline letters drift apart + fade as the hero scrolls out, scrubbed off
   the **Lenis** scroll position; reverses on scroll-up.
5. **Per-letter hover spring**: hovering a headline letter springs it (lift + elastic settle).

## Non-Goals

- No metric / count-up strip in the hero.
- No underline-draw, no motion-path glow dot.
- No change to the video background, dark grades, layout, copy, or CTA markup.
- No changes to other sections (Roster, Partners, etc.) in this work.

## Division of motion responsibilities

- **Framer-Motion** (existing) — keeps the kicker / sub / CTA `fadeUp` reveals and any layout work.
- **Lenis** (existing) — smooth scroll; now also the scrub source for the scatter effect.
- **Anime.js** (new) — owns the 5 hero effects above.

## Architecture

Keep `Hero.tsx` readable by extracting the Anime.js logic into focused hooks/helpers rather than
inflating the component. Proposed units (final names decided in the plan):

- **`splitGraphemes(text)` helper** — splits a string into `<span class="char"><span class="glyph">…</span></span>`
  pairs. Outer `.char` owns scatter transforms; inner `.glyph` owns hover transforms — separation
  prevents the two from fighting over `transform`. Returns the char nodes.
- **`useHeroIntro(refs, reduce)`** — runs the mount timeline: scramble line 1, then `animate` a
  staggered per-letter rise; fade line 2 (prefix + cycling word) in just after. Plays once.
- **`useCyclingWord(ref, words, reduce)`** — interval-driven scramble swap of the accent word;
  pauses when the hero is off-screen (reuse the existing `IntersectionObserver` already in `Hero.tsx`
  for video play/pause, or a shared visibility flag).
- **`useCursorGlow(heroRef, glowRef, reduce)`** — `createAnimatable` on the glow element; `mousemove`
  on the hero sets eased `x`/`y`. Pointer-fine + non-reduced-motion only; toggles opacity on
  enter/leave.
- **`useScrollScatter(heroRef, chars, reduce)`** — subscribes to the Lenis instance (`useLenis`)
  scroll value, computes hero-exit progress `p = clamp(scroll / (heroHeight * 0.7), 0, 1)`, and on
  each scroll frame sets each `.char` transform (`translate` + `rotate` from a per-char random offset
  seeded once) and `opacity = 1 - p`. Reversible. Uses `requestAnimationFrame` throttle.

The accessible headline text stays intact: real text in the DOM, `aria-label` on the `<h1>`, spans
are visual-only. The scramble must restore exact final characters.

### Reduced motion

`useReducedMotion()` (Framer) / `prefers-reduced-motion` gates everything: headline renders static
and fully visible, no glow, no scatter, no cycling, no hover spring. This matches the `.impeccable.md`
"Motion on intent" principle.

### Touch / no-pointer

Cursor glow and hover spring are `(pointer: fine)` only. Intro, cycling word, and scatter run on all
devices (subject to reduced-motion).

## Data flow

1. Mount → `splitGraphemes` builds char spans + seeds scatter offsets → `useHeroIntro` plays once.
2. `useCyclingWord` interval swaps the accent word; rebuilds its char spans after each swap so hover
   binding stays valid.
3. Pointer move → `useCursorGlow` eases the glow position.
4. Lenis scroll → `useScrollScatter` scrubs char transforms/opacity.
5. Pointer enter on a glyph → one-shot elastic `animate`.

## Dependencies

- Add `animejs` (v4) to `package.json`. Tree-shaken named imports: `animate`, `stagger`, `utils`,
  `createAnimatable`. React cleanup: revert/cancel animations + remove listeners on unmount.

## Files

- `package.json` — add `animejs`.
- `src/components/sections/Hero.tsx` — wire the hooks; markup gains `id`/`ref` hooks for glow + lines;
  keep video, grades, kicker, sub, CTAs as-is.
- `src/hooks/useTextScramble.ts` — replaced/superseded by the new intro + cycling logic (remove if
  fully unused after migration).
- New hook file(s) under `src/hooks/` (e.g. `useHeroMotion.ts`) and/or a small `src/lib/splitText.ts`
  helper.

## Risks / edge cases

- **Transform conflict** between scatter and hover — solved by the outer/inner span split.
- **Cycling word + hover binding** — rebind hover after each word rebuild, or delegate the listener.
- **Scramble correctness** — must land on exact final text; guard against interval leaks (clear on
  unmount).
- **Lenis availability** — `useLenis()` can return null before mount; scatter must no-op until ready
  (existing `MainPage.tsx` already guards this pattern).
- **Performance** — scatter writes transforms each scroll frame; throttle with rAF and only touch
  chars (small N).

## Verification

- `npm run dev`, load `/`: headline scrambles then settles; accent word cycles; glow trails cursor;
  letters spring on hover; scrolling scatters + fades the headline and reverses on scroll-up.
- Toggle OS reduced-motion → headline static, no glow/scatter/cycle/hover.
- Mobile/touch viewport → no glow/hover; intro + cycle + scatter still behave.
- Confirm video bg, grades, copy, and CTAs visually unchanged vs current hero.
- `npm run build` clean (no type errors); `animejs` tree-shakes (bundle delta reasonable).
