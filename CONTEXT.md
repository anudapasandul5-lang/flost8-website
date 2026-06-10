# FLOST8 Context

FLOST8 is a Colombo-based artist management brand. The launch stack is a Vite
React site backed by Google Apps Script, Google Calendar, Google Sheets, Gmail,
Cloudflare Pages, and Cloudflare Turnstile.

## Domain Terms

- Booking Intake Contract: the shared shape for website booking forms, Apps
  Script validation, Turnstile tokens, and lead-write responses.
- Upcoming Show Feed: the public list of calendar-derived events shown on the
  home page and bookings page.
- Artist Roster Policy: the source of truth for public artist slugs, display
  names, booking options, KPI roster names, and calendar eligibility.
- Rep Sync Tab Policy: the rules for Outbound, Inbound, and Bookings tabs,
  including required fields, stage order, and master-sheet routing.
- KPI Report Policy: the mapping from master sheet type to the KPI report that
  renders into its dashboard tab.
- Apps Script Deployment Assembly: the manifest-driven process that combines
  source `.gs` files into the paste-ready deployment bundle.
- Hero Ambient Loop: the short looping background video on the home hero,
  derived from the hero photograph, with that photograph as the static
  fallback for reduced-motion and blocked-autoplay visitors.

## Non-Negotiables

- Google Calendar is the availability source of truth.
- Site inquiry form writes site leads into operations sheets without changing
  WhatsApp and Instagram workflows.
- Canonical domain is `flost8.lk`.
- Operator surfaces should stay simple: sheet rows and artist photos should be
  enough to onboard or operate the system.
