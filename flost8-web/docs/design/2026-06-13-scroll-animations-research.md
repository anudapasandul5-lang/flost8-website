# FLOST8 — Scroll Animation Research & Menu

Researched via design-taste-frontend + high-end-visual-design arsenals + web (Motion docs, olivierlarose Awwwards tutorials). Goal: a coherent, on-brand scroll-motion layer — not motion for its own sake. Everything below is feasible on the EXISTING stack (Lenis smooth scroll + framer-motion `useScroll`/`useTransform`/`whileInView` + anime.js) with **no new deps and no GSAP** (design-taste rule: never mix GSAP/Three with framer in one tree).

## Hard rules (apply to every item)
- Gate ALL motion through `useMotionSafe()` (`reduce` → static fallback). Reduced-motion users get the final state instantly.
- Animate ONLY `transform` + `opacity` (GPU). Never `top/left/width/height`.
- framer `useScroll({ target })` element MUST be non-`static` → add `relative` (logged antipattern 2026-06-12).
- 360px: any pinned/horizontal effect must fall back to normal vertical stack on mobile.
- Don't fight what already exists: `ScrollFadeSection` (per-section opacity scrub), Partners center-out reveal, Hero scroll-scatter, Metrics count-up. New items either replace or layer cleanly.

---

## TIER 1 — Signature moments (pick 1–2; these define the feel)

### A. Roster horizontal scroll-pin gallery  ⭐ highest impact
Pin the Roster section and translate the artist panels sideways as you scroll down — a cinematic "scroll through the roster." Sticky container + `useTransform(scrollYProgress,[0,1],["0%","-70%"])` on a wide flex row (Motion's documented horizontal-section pattern). Mobile (<md): fall back to today's vertical accordion (no pin).
- Stack: framer useScroll/useTransform. Effort: M–L. Risk: M (replaces current desktop accordion; tall container + sticky math). Reduced-motion: static horizontal scroll or current accordion.

### B. Sticky stacking cards for "What We Do"
The 3 numbered items become cards that pin and let the next slide/scale over the previous (olivierlarose cards-parallax: each card `position: sticky; top: calc(... + i*25px)`, inner image `scale` 2→1 via per-card useScroll `offset:['start end','start start']`). Feels expensive, reinforces "01 → 02 → 03" as a build.
- Stack: framer per-card useScroll. Effort: M. Risk: L–M. Reduced-motion: plain stacked rows (today).

### C. Perspective section transition at major seams
As you leave a section, it scales down + rounds its corners while the next slides up over it (depth/parallax between sections). Apply at 1–2 seams (e.g. Hero→Roster, Shows→Join). Single shared `useScroll` on a wrapper, `scale`/`borderRadius` via useTransform.
- Stack: framer. Effort: M. Risk: M (interacts with ScrollFadeSection — would replace it at those seams). Reduced-motion: instant.

---

## TIER 2 — Polish layer (cheap, high taste-per-effort; can do several)

### D. Line-mask headline reveals
Big headlines (THE ROSTER, WHAT WE DO, IMPACT THAT MOVES FORWARD, JOIN THE ROSTER) reveal line-by-line on enter: each line rises from a clipped box (`clip-path`/translateY + opacity) via `whileInView` + `staggerChildren`, `viewport:{once:true}`. Editorial, on-brand, replaces the generic section fade for headlines.
- Effort: S. Risk: L. Reduced-motion: text just present.

### E. Hero background zoom-parallax on exit
Bg video/image scales slightly (1→1.08) and drifts slower than scroll as the hero leaves (depth). Layers under the existing text scroll-scatter.
- Effort: S. Risk: L. Reduced-motion: static.

### F. Shows rows stagger + date-chip pop
Each show row slides in (x/opacity) on enter via `whileInView` stagger; the accent date chip pops with a spring overshoot. Makes the list feel alive vs. appearing flat.
- Effort: S. Risk: L. Reduced-motion: present, no slide.

### G. JoinRoster watermark parallax
The oversized "JOIN" watermark + crowd backdrop move at a slower rate than foreground content (`useTransform` y) for depth. Foreground CTAs unaffected.
- Effort: S. Risk: L. Reduced-motion: static.

### H. Stats scroll-progress underline
Under each count-up stat, a 0→100% accent underline draws as the grid enters (scaleX via whileInView), syncing with the number roll. Reinforces "the receipts."
- Effort: S. Risk: L. Reduced-motion: full underline shown.

---

## TIER 3 — Optional / use sparingly (trend risk)

### I. Scroll-velocity skew
Content subtly skews/`skewY` with Lenis scroll velocity (fast scroll → slight lean, settles on stop). Trendy on Awwwards but can feel gimmicky on a brand site; use at most on one band (e.g. a marquee).
- Effort: M. Risk: M (taste). Reduced-motion: off.

### J. EyebrowRule draw-on-scroll
The existing eyebrow underline draws (scaleX 0→1) as each section enters instead of being static. Tiny touch, ties sections together.
- Effort: S. Risk: L.

### K. Zoom-parallax image grid (future Collaborations/gallery)
If a media gallery is ever added, the zoom-parallax (a center image expands to fill on scroll, others spread out) is the standout olivierlarose effect. Not applicable to current sections — park for a future media/`/watch` page.

---

## Recommended starter set (coherent, not overdone)
**D + E + F + H** (Tier-2 polish across the page — low risk, immediately premium) **plus ONE Tier-1 signature** — recommend **B (sticky stacking What We Do)** as the safest high-impact, or **A (Roster horizontal pin)** if you want the boldest single moment. Hold Tier-3 unless you want extra edge on one band.

Sequencing: ship Tier-2 first (fast, reversible), then the chosen Tier-1, QA on 360px + reduced-motion after each, deploy:dev to review.

## Sources
- Motion (framer-motion) scroll docs — useScroll/useTransform/whileInView, horizontal pin recipe: https://motion.dev/docs/react-scroll-animations
- olivierlarose Awwwards tutorials (sticky cards, perspective transition, zoom parallax, text parallax, SVG path): https://blog.olivierlarose.com/tutorials
- Repo's own Lenis + animejs refs in vault (`wiki/sources/lenis-complete-reference.md`, `animejs-v4-complete-reference.md`).
