# FLOST8 Web — Context

Domain language for the FLOST8 marketing site (React + Vite). Defines project-specific terms so code and reviews use one consistent vocabulary.

## Language

**motion-safe**:
The single seam (`src/hooks/useMotionSafe.ts`) that decides whether motion runs, honoring the user's `prefers-reduced-motion` setting. Every animation site — framer-motion and anime.js alike — reads its verdict (`reduce`) and gates through it (`guard`, `variant`) rather than calling `useReducedMotion()` directly.
_Avoid_: reduced-motion-check, a11y-guard, shouldReduce

**intake page**:
A standalone form route that captures a submission and POSTs it to `/api/script` with a `type` discriminator (`booking | partner | collab | join`); Apps Script routes each `type` to its own sheet tab. The four intakes are `/bookings`, `/partner`, `/collaborate`, `/join`. All share the `IntakeForm` component (`src/components/IntakeForm.tsx`) and the `intakeContract` (`src/lib/intakeContract.ts`), except `/bookings` which predates it and keeps `bookingContract`.
_Avoid_: contact-form, lead-form (too generic — they are distinct typed intakes)

**roster (display-only)**:
The homepage Roster section shows artists as cards with no dedicated profile page in this phase. The "View Artist" CTA deep-links to `/bookings?artist=<slug>`, not to a profile route. Per-artist profile pages (bio, photos, live videos, history) are explicitly deferred.

**partner / collaborate / join**:
Three DISTINCT intake intents, not synonyms. `partner` = partnerships + content-engine (Hero "Work With Us" + JoinRoster "Work With FLOSTATE"). `collaborate` = brand campaign / creative submission (footer-only entry; no homepage section). `join` = artist application to the roster. Keep them separate in copy, routing, and sheet tabs.

**FLOST8**:
The single canonical brand display name everywhere. "FLOSTATE" appears only as the button label "Work With FLOSTATE" (a stylistic label, not a sub-brand). Any "FLOTS8" / ".com" is a bug.
_Avoid_: FLOSTATE, FLOTS8, FLOST8.com
