# 0001 — Single scrolling homepage + sub-routes for intakes

Date: 2026-06-13
Status: Accepted

## Context

The owner authored a final site structure of seven "PAGES" (Hero, Roster, Stats/Impact, What We Do, Collaborations, Upcoming Shows, Join the Roster) plus a footer. Several CTAs point to destinations that need their own URL: artist applications, brand-deal submissions, and partnership intakes. The existing app is a single scrolling homepage (`/` → MainPage with stacked sections) plus one separate route (`/bookings`).

The decision: are the seven "PAGES" seven separate routes, or sections of one scrolling homepage?

## Decision

Keep ONE scrolling homepage (the seven sections, in the owner's order, as stacked components in `MainPage`). Add separate routes ONLY for the form destinations the CTAs point to: `/partner`, `/collaborate`, `/join` (alongside the existing `/bookings`). The "Collaborations" homepage section was later dropped by the owner, but `/collaborate` remains reachable via the footer.

## Alternatives considered

- **Seven separate routes** (`/roster`, `/impact`, `/what-we-do`, …): every section gets its own URL and nav entry. Rejected — much larger build (new nav model, per-page layout, more surfaces for content to drift), and it abandons the established single-scroll narrative the site already ships.

## Consequences

- The homepage stays a single narrative scroll; section anchors (`#roster`, `#about`, `#shows`) drive in-page nav via Lenis.
- Only four routes carry forms; they share one `IntakeForm` component + `intakeContract`, and one Pages Function (`/api/script`) that forwards a `type` discriminator verbatim to Apps Script.
- The three new intake pages are lazy-loaded (`React.lazy` + Suspense) so they don't bloat the homepage bundle.
- Trade-off accepted: less URL granularity (no shareable `/roster` link) in exchange for build cost, visual consistency, and a single content surface. Reversible later by promoting sections to routes if SEO/deep-linking needs it.
