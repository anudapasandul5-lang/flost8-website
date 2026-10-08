# FLOST8 Final Structure — Design Brief

Design direction for the new/changed surfaces in the final-structure build. Routed through `design-taste-frontend` (variance 8 / motion 6 / density 4), to be finalized by `high-end-visual-design`. All surfaces MUST match the repo's existing language — do NOT invent a new visual system.

## Shared language (reuse, do not reinvent)

- **Section shell:** `<section className="relative bg-base py-10 md:py-20">` → inner `mx-auto max-w-[1400px] px-6 md:px-10`. Wrap each in `<ScrollFadeSection>` from MainPage.
- **Header block pattern** (Roster/Shows use it): eyebrow `font-grotesk text-[13px] uppercase tracking-[0.25em] text-accent-ink` → `<EyebrowRule />` → `h2 className="mt-3 font-display text-5xl md:text-7xl leading-[0.9] text-ink"`.
- **Tokens:** `bg-base` #120917, accent `#9D14FF` (brand — keep), `text-ink`, `--ink-72/50/32`. Fonts: `font-display` Bebas Neue, `font-grotesk` Space Grotesk.
- **Glass/tactile:** `edge-refract` on raised surfaces, `accent-press` on primary buttons.
- **Motion:** `SPRING`/`EASE` from `src/lib/motion.ts`; gate ALL motion via `useMotionSafe()` (`reduce`/`variant`). Animate only `transform`/`opacity`.
- **Primary CTA:** accent pill — `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-6 py-3.5 font-grotesk text-ink accent-press edge-refract`. **Ghost CTA:** `... border border-[var(--accent-line)] bg-transparent ... hover:bg-[var(--accent-soft)]`.
- **Buttons:** explicit `type="button"`; navigations use `<Link>`/`<a>`. 360px: no horizontal scroll.

## Surface specs

### 1. Roster — per-card CTAs (active card only)
Active card bottom block currently = index + name + role. Add a CTA row below role:
- *Book Now* (accent pill, compact) → `/bookings?artist=<slug>`
- *View Artist* (ghost/text-underline, compact) → `/bookings?artist=<slug>` (interim)
Constraints: compact pills (`text-sm`, `min-h-[44px]`), fit inside the 360px-tall mobile active card and the desktop active panel without clipping. Reveal with the existing active-content (fade/slight-rise, motion-safe). Buttons must stop click-through to the card toggle (`e.stopPropagation`).

### 2. Stats (Metrics) — add header, real numbers
Metrics has no header today. Prepend the standard header block: eyebrow "Impact" → EyebrowRule → h2 "IMPACT THAT MOVES FORWARD"; below the grid OR under the h2, tagline `font-grotesk text-lg text-[var(--ink-50)]`: "The movement is not growing. It's spreading." Keep the existing divided-border grid (no cards — correct per anti-card rule). Numbers 30/24/12/40 via count-up; relabel "Monthly reach" → "Content produced".

### 3. What We Do (repurposed Services)
Keep the `divide`/numbered-row anti-card layout. Eyebrow "What We Offer" → "What We Do"; h2 "THREE WAYS / WE WORK" → "WHAT WE DO". Section keeps id `about`. Bottom link can stay "Start a project" → `/bookings`.

### 4. Collaborations (NEW) — minimal/editorial, asymmetric
Owner: "Featured visual / minimal layout or empty-state grid." Direction (density 4, airy):
- Asymmetric split: left = header block (eyebrow "Collaborations" → EyebrowRule → h2 "COLLABORATIONS") + statement line `font-display`-scale or large grotesk: "We don't place ads. We place culture inside moments." + primary CTA *Brand Deal Collaboration* → `/collaborate`.
- Right (or below on mobile): a SPARSE empty-state grid of 2–3 "open collab slot" tiles — `edge-refract` with a dashed accent hairline border, faint label (e.g. "Open slot — your brand"), NOT 3 equal solid cards. Stagger-reveal, motion-safe. Avoid the banned 3-equal-card row.
- No fake logos. Atmospheric, not busy.

### 5. Join the Roster (NEW) — bold statement, full-bleed feel
Direction: dark statement section with optional faded portrait/crowd backdrop (reuse `/ui2/gen/*` like BookingsPreview did) + oversized watermark word "JOIN" (`font-display text-accent/5 text-[16-22vw]`, pointer-events-none) for depth.
- Header: h2 "JOIN THE ROSTER"; sub `font-grotesk text-[var(--ink-72)]`: "An entry point into the movement." + emphasis line "We don't take everyone. We build the right ones."
- CTAs: *Join Roster* (accent pill) → `/join`; *Work With FLOSTATE* (ghost) → `/partner`.

### 6. Intake pages /partner /collaborate /join (NEW)
Clone the `BookingsPage.tsx` pattern exactly (label-above-input, error-below, `gap-2`, `bg-raise` + `border-[var(--bg-line)]` + `font-grotesk rounded-xl py-3.5` inputs w/ accent focus + edge-refract, accent submit pill, Turnstile gate, motion-safe field stagger, success/error states with `role="status"`/`role="alert"`, aria-invalid/aria-describedby). Each page: header (eyebrow + big headline + one-line intent) then the form.
- Per-page headline copy: /partner "WORK WITH US"; /collaborate "BRAND DEAL COLLABORATION"; /join "JOIN THE ROSTER".
- Fields per plan (owner may adjust). All carry `type: 'partner'|'collab'|'join'` in payload.
- **Lazy-load** these 3 pages via `React.lazy` + `<Suspense>` in App.tsx to keep the homepage bundle lean.

## Pre-flight (all surfaces)
min-h-[100dvh] for any full-height; useEffect cleanup on any timer/listener; empty/loading/error states on forms; cards omitted in favor of dividers/space where possible; perpetual motion isolated + motion-safe.

---

## high-end-visual-design finalization (consistency overrides)

The premium bar here is hit by matching the site's existing expensive language exactly, NOT by bolting divergent flourishes onto new sections (that would clash with the kept sections). Explicit overrides of the generic skill defaults:

- **Spacing:** KEEP `py-10 md:py-20` section rhythm (owner's earlier 40%-tighter decision). Do NOT apply the generic `py-24+` macro-whitespace — it would desync new sections from the rest of the page.
- **Bezel/material:** the repo's `edge-refract` IS the double-bezel here. Use `edge-refract` + `rounded-2xl`/`rounded-xl` on raised surfaces. Do NOT introduce a new nested outer-shell/inner-core treatment — it would look foreign next to existing cards.
- **CTA icon:** match existing CTAs — accent pill + naked `ArrowUpRight`/`ArrowRight` (Hero, BookingsPreview, Shows all do this). Do NOT introduce the "button-in-button" circular-icon-wrapper on new sections only; consistency beats the isolated flourish (revisit site-wide later if ever).
- **Scroll entry:** new sections get the standard `<ScrollFadeSection>` opacity scrub (already the site's entry system). Do NOT add per-element blur-up reveals that diverge from it. Within-section element stagger uses the existing `SPRING`/`staggerParent` presets, motion-safe.
- **Fonts:** Bebas Neue (`font-display`) + Space Grotesk (`font-grotesk`) only — already premium, no change.
- **Watermark motif:** JoinRoster's oversized "JOIN" watermark mirrors BookingsPreview's "BOOK" — reuse that exact treatment for continuity (`font-display text-accent/5`, pointer-events-none, absolute).
- **Forms:** pixel-match `BookingsPage.tsx` input/label/error/submit treatment — it is already the high-end reference in this repo. No new form styling.

Net: the new Collaborations, JoinRoster, and 3 intake pages should be indistinguishable in polish/material/motion from Hero + Services + BookingsPage. Restraint + consistency = the expensive result.
