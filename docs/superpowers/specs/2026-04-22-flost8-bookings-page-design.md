# FLOST8 Bookings Page — Design Spec

**Date:** 2026-04-22
**Branch:** `v2`
**Target launch:** ~2026-05-06 (two weeks from brief)
**Target MVP ready:** ~2026-04-29 (one week)
**Owner:** Anuda (FLOST8)
**Authoring agent:** Claude Opus (orchestrator), delegating to Sonnet/Haiku for sub-work

---

## 1 · Context

FLOST8 (flost8.lk) is a Colombo-based music/artist management brand. The existing single-page site (`flost8 website.html` on `master`) covers hero, about, visual styles, roster, services, and join CTAs. There is no public booking path on the site today; bookings flow entirely through WhatsApp and Instagram.

This spec defines a new **Bookings** section of the site that:

1. Shows the public list of upcoming shows, sourced from Google Calendar (SSOT for bookings).
2. Lets prospective bookers submit a structured inquiry via a public form.
3. Writes each inquiry straight into the existing Bookings Sheet with stage set to `2-Qualified` — skipping the First-Reply Template (T1) because all 7 mandatory fields arrive pre-populated from the form.
4. Leaves the existing WhatsApp and Instagram flows completely unchanged. The site is **additive**, not a replacement.

A Cal.com-style per-artist self-select booking page was requested in the brief. It is **explicitly deferred to v1.1** to hit the one-week MVP window. Same pattern applies to a planned `watch.html` media page (short-form video + YouTube live sets) — specified lightly here so v1.1 rework is minimal, but not shipped in this launch.

## 2 · Constraints and contract (non-negotiable)

- Google Calendar is the single source of truth for bookings and availability.
- Site-origin leads arrive with 7 mandatory fields pre-populated, start at Stage 2 (Qualified), skip T1.
- WhatsApp + Instagram flows continue unchanged.
- Canonical domain is **flost8.lk**. All new pages, emails, and metadata use `.lk`. Any `.com` reference is a bug.
- `flost8 website.html` on master is **frozen** as a snapshot until v2 is merged. All work happens on branch `v2`.
- User is non-technical and acts as project manager. Operator-facing surfaces (Sheet tabs, Calendar, photo folders) must be the only touchpoints for running the system once launched. No code edits required for day-to-day ops, including onboarding new artists.
- Subagents spawned for build work should default to **Sonnet** (or **Haiku** for narrow lookups) to control cost. Opus is the orchestrator only.

## 3 · Goals

- Ship a single new page **`/bookings`** linked from a new `BOOKINGS` nav tab.
- Display upcoming FLOST8 shows (date, artist, venue, city, time — **lineup intentionally hidden**).
- Collect qualified inquiries into the Bookings Sheet with zero manual re-entry.
- Auto-notify both the booker (24 hr reply promise) and the owner on every submission.
- Keep artist onboarding a **Sheet row + photo upload** operation, not a code change.
- Keep the site static and deployable to Vercel with no build step.

## 4 · Non-goals (v1.1 backlog)

- Per-artist Cal.com-style self-select booking page.
- Calendar month-grid view.
- `/watch` page with short-form videos (Google Drive hosted) + live set YouTube embeds.
- Lead-funnel analytics dashboard.
- Sinhala / Tamil translations.
- SMS notifications.
- Auto-sync of the roster grid on the main site from the `artists` tab — **actually in scope for this launch** per user direction; it is listed here only to note that it was initially flagged as deferrable.

## 5 · Architecture

Three cooperating buildings:

```
┌──────────────────────┐     reads      ┌──────────────────────┐
│ Vercel static site   │ ──── GET ─────▶│ Apps Script Web App  │
│ flost8.lk            │                 │  /exec endpoint      │
│                      │ ◀── JSON ───────│   doGet(): reads     │
│ - flost8 website.html│                 │   doPost(): writes   │
│ - bookings.html      │ ── POST form ─▶│                      │
│ - photos/            │                 └──────────────────────┘
│ - config.js (URL)    │                         │
└──────────────────────┘                         ├──▶ Google Calendar (3 artist calendars, read)
         │                                       ├──▶ Google Sheet "Bookings" (append rows)
         │                                       ├──▶ Google Sheet "artists" config tab (read)
         │                                       └──▶ Gmail: auto-reply + owner notification
         │
         └─ Turnstile widget ──▶ Cloudflare (token verified server-side)
```

### 5.1 Components

| Component | Where it lives | What it owns |
|---|---|---|
| Static site | Vercel (free tier) | Presentation, client-side validation, Turnstile widget, fetch calls. No secrets. |
| Apps Script Web App | script.google.com, deployed as `Anyone / anonymous` | Google Calendar reads, Sheet writes, Turnstile verify, email dispatch, 5-minute cache |
| Google Sheet `Bookings` | Owner's Drive | Inquiry rows from all sources (site, WhatsApp, Instagram) |
| Google Sheet `artists` tab | Same Sheet, second tab | 5-column roster config — the operator surface |
| Photo folder | Repo `photos/<slug>.jpg` (or Drive public link) | Portrait per artist |
| Calendar per artist | Google Calendar × 3 (Dr. Green, Kiran, Sonal) | Individual schedules; joint shows duplicated and merged server-side |
| Turnstile | Cloudflare free tier | Invisible bot filter on the form |

### 5.2 Data flow — calendar display

1. Visitor opens `/bookings`. Page fires `fetch('<APPS_SCRIPT_URL>?action=upcoming&n=20')`.
2. Apps Script reads the `artists` tab (cached 5 min) to get the active list of calendars.
3. For each active calendar, `Calendar.Events.list(calId, {timeMin: now, maxResults: 20, singleEvents: true, orderBy: 'startTime'})`.
4. Events are normalised `{date, time, venue, city, artist_display_name, artist_slug}`. Lineup / description / attendees are stripped.
5. Events are merged on `(normalised_venue, date)`. When multiple hit, artist names join with ` + `. Normalisation = lowercase + strip punctuation + collapse whitespace.
6. Sorted ascending by datetime, sliced to first 20, returned as JSON.
7. Cached in Apps Script `CacheService` for 300 seconds keyed on `upcoming:20`.

### 5.3 Data flow — inquiry submission

1. Visitor fills form. Turnstile renders invisibly and exposes a one-time token.
2. Client validates required fields. Submit button disabled until valid; re-enabled on focus of any field.
3. Client `POST` to `<APPS_SCRIPT_URL>` with JSON body: `{token, artist, event_date, venue, city, event_type, set_duration_h, organizer_name, direct_number, organizer_email, other_artists, console_setup}`.
4. Apps Script:
   a. Verifies Turnstile token with Cloudflare. Failure → HTTP 429 + `{ok:false, reason:'bot_check_failed'}`.
   b. Re-validates every field server-side. Failure → HTTP 400 + `{ok:false, errors:[{field, message}]}`.
   c. Looks for duplicate in last 5 minutes matching `(direct_number, event_date, normalised_venue)`. Match → returns 200 `{ok:true, deduped:true}`, no new row, no emails.
   d. Appends row to `Bookings` tab (schema below).
   e. Sends booker auto-reply from `bookings@flost8.lk`.
   f. Sends owner notification to the configured owner email.
   g. Returns 200 `{ok:true, lead_id}`.
5. On success, client swaps form to a thank-you panel showing the `lead_id` and WhatsApp fallback for same-week bookings.

### 5.4 Rate limiting and dedup

- Turnstile token required on every POST.
- Apps Script stores recent `(ip, phone)` pairs in `CacheService`. Cap: 5 successful POSTs per hour per pair. Excess → HTTP 429.
- Dedup window described above prevents accidental double-submit from single-click-twice / back-button resubmit / browser resend.

### 5.5 Email fallback

If row append succeeds but either email send throws (quota, Gmail outage), the exception is caught and a row is appended to a hidden `email_retry` tab with the fields needed to re-send. A time-driven trigger (every 15 min) drains that tab by retrying each pending send and marking success. The owner never loses a lead because the Sheet row was written before email was attempted.

## 6 · Page structure — `bookings.html`

Top to bottom:

1. **Nav** — copied from main site; the `BOOKINGS` item gets a purple highlight to indicate current page. `JOIN` CTA preserved.
2. **Hero** — eyebrow `// Bookings · Live calendar & inquiries`, display heading `Book the flow.`, subcopy one sentence about 24 hr reply.
3. **Upcoming shows** — section label `// 01 — Upcoming`, heading `Next shows`, right-aligned small label `LIVE FROM GOOGLE CALENDAR`. Rows: 5-column grid (date · artist · venue · city · time). 1px hairline separator between rows, brand purple for artist name, cyan for date, dim grey for city/time. Mobile collapses to stacked.
4. **Inquiry form** — section label `// 02 — Inquire`, heading `Send an inquiry`. 10-field layout on 2-column desktop, single column mobile. Submit button purple, bottom-right. Turnstile note bottom-left.
5. **Footer** — condensed version of the main site footer; canonical `flost8.lk`.

### 6.1 Form schema (in DOM order)

| # | Label | Input type | Required | Validation |
|---|---|---|---|---|
| 1 | Artist | `<select>` | No | Options loaded from `artists` tab; default `any`; value is the slug |
| 2 | Event date | `<input type="date">` | Yes | Min = tomorrow (Asia/Colombo), max = +2 years |
| 3 | Venue | `<input type="text">` | Yes | Length 2–80 |
| 4 | City | `<input type="text">` | Yes | Length 2–80, suggest `City, Country` |
| 5 | Event type | Two-button pill group | Yes | One of `NIGHT` / `DAY` |
| 6 | Set duration | `<input type="number">` | Yes | 1–8, step 0.5 |
| 7 | Organizer name | `<input type="text">` | Yes | Length 2–80 |
| 8 | Direct number | `<input type="tel">` | Yes | ≥6 digits after stripping non-digits, no hard country regex |
| 9 | Organizer email | `<input type="email">` | Yes | RFC-5321 compliant email; required because booker auto-reply is in launch scope |
| 10 | Other artists on lineup | `<input type="text">` | No | Empty is acceptable; stored as `TBD` when empty |
| 11 | Console + setup | `<textarea>` | Yes | Length 10–500 |
| — | Turnstile | widget | Auto | Token must verify server-side |

**Note on the "7 mandatory fields" brief.** The original brief listed seven mandatory *items*: (1) event date, (2) venue + city, (3) event type, (4) set duration, (5) organizer name + direct number, (6) other artists on lineup, (7) console + setup. Items 2 and 5 are collected as two separate inputs each for better UX, and item 6 is accepted empty (stored as `TBD`). A new **mandatory Organizer email** field is added to enable the booker auto-reply described in §9.1. The Sheet still maps 1:1 onto the brief's seven items plus the additions (artist, email).

### 6.2 URL parameters

- `?artist=<slug>` — pre-selects the matching option. If slug is unknown / inactive, silently falls back to `any`. No error.
- No other params in scope.

### 6.3 States

Form panel has five states:

- **Default** — all empty, submit disabled.
- **Valid** — required fields satisfied, submit enabled.
- **Submitting** — button shows spinner + text `SENDING…`, all inputs disabled.
- **Success** — form replaced by thank-you panel: `Got it. <artist display> replies within 24 hrs. Lead ID: <L-…>. For dates inside 72 hrs, WhatsApp +94 XX XXX XXXX.`.
- **Error** — red banner above form with reason (`bot check failed, please retry` | `fix the fields below` | `offline, tap to retry`); inputs re-enabled, values preserved.

Calendar panel has four states:

- **Loading** — shimmer placeholder rows.
- **Populated** — list of up to 20 rows.
- **Empty** — copy: `No upcoming shows yet — inquire below to book one.`
- **Error** — copy: `Calendar temporarily unavailable — please refresh.`

### 6.4 Accessibility and responsiveness

- Labels are true `<label for="">` bound to inputs, not placeholder-as-label.
- Tab order follows visual order.
- Form collapses to 1 column below 720px.
- Touch targets ≥44px.
- `100dvh` not `100vh` on any full-height element.
- Colours use existing FLOST8 CSS variables already defined in `flost8 website.html` (cream, purple, cyan, dim, surface, border). No new hex.
- All times display in **Asia/Colombo** with explicit suffix on mobile.

## 7 · Sheet schemas

### 7.1 `Bookings` tab (append-only from script)

| Col | Name | Source | Example |
|---|---|---|---|
| A | Lead ID | script generated `L-YYYY-MM-DD-NNN` | `L-2026-04-22-001` |
| B | Timestamp | `new Date()` | `2026-04-22 14:33:12` |
| C | Source | constant `site` | `site` |
| D | Stage | constant `2-Qualified` | `2-Qualified` |
| E | T1 sent | constant `skip` | `skip` |
| F | Artist | field 1 | `dr-green` or `any` |
| G | Event date | field 2 | `2026-06-14` |
| H | Venue | field 3 | `Warehouse 21` |
| I | City | field 4 | `Colombo, LK` |
| J | Event type | field 5 | `NIGHT` |
| K | Set duration (h) | field 6 | `3` |
| L | Organizer name | field 7 | `Shehan P.` |
| M | Direct number | field 8 | `+94 77 123 4567` |
| N | Organizer email | field 9 | `shehan@example.com` |
| O | Other artists | field 10 or `TBD` | `DJ Sunflower, TBD` |
| P | Console + setup | field 11 | `CDJ-3000 x2, DJM-A9, F1 F88` |
| Q | Owner notes | blank, owner-filled | — |
| R | Quote status | blank, owner-filled | — |

Existing WhatsApp/Instagram inquiries continue to land in the same tab via their current automation. Column C (`Source`) separates channels.

### 7.2 `artists` tab (operator-editable config)

| slug | display_name | calendar_id | photo_url | active |
|---|---|---|---|---|
| dr-green | DR. GREEN | `abc@group.calendar.google.com` | `photos/dr-green.jpg` | TRUE |
| kiran | KIRAN | `def@group.calendar.google.com` | `photos/kiran.jpg` | TRUE |
| sonal | SONAL | `ghi@group.calendar.google.com` | `photos/sonal.jpg` | TRUE |

Rules:

- `slug` — lowercase, kebab-case, must match `/^[a-z0-9-]{2,40}$/`, unique.
- `display_name` — free text, uppercase by convention.
- `calendar_id` — Google Calendar ID (anything Google Calendar API accepts).
- `photo_url` — either a repo-relative path (`photos/<slug>.jpg`) or a full URL (Drive public link, CDN). Website layer resolves.
- `active` — `TRUE` / `FALSE`. `FALSE` hides the artist from roster grid, dropdown, and upcoming feed; preserves historical data.

Script invalidates its internal 5-minute cache automatically on the next read. No manual refresh step.

### 7.3 `email_retry` tab (internal, hidden from normal ops)

`timestamp | lead_id | email_type (booker|owner) | to_address | subject | body | attempts | last_attempt_at | status`

Drained by a 15-min time-driven trigger.

## 8 · Apps Script contract

Single Web App deployment. Two logical endpoints distinguished by HTTP verb and `action` query param.

### 8.1 `GET /exec?action=upcoming&n=20`

- Returns `{ok: true, events: [{date, time, artist_display, artist_slug, venue, city}, ...]}`.
- `date` in `YYYY-MM-DD` format; `time` in `HH:mm` in Asia/Colombo; `artist_display` may be `"DR. GREEN + KIRAN"` after merge; `artist_slug` is the first matching slug alphabetical (for deep-link fallback). If the API call fails entirely, returns `{ok: true, events: [], degraded: true}` so the page shows the empty state, not an error.

### 8.2 `GET /exec?action=roster`

- Returns `{ok: true, artists: [{slug, display_name, photo_url}, ...]}` filtered to `active=TRUE`, alphabetical by `display_name`.
- Also cached 5 min.

### 8.3 `POST /exec`

- Body: JSON with all 10 form fields + Turnstile token.
- Steps described in §5.3.
- Returns `{ok: true, lead_id}` or `{ok: false, errors|reason}`.

### 8.4 Secret management

Stored in Script Properties (Google-managed secret store):

- `TURNSTILE_SECRET`
- `BOOKINGS_SHEET_ID`
- `OWNER_EMAIL`
- `FROM_EMAIL_ALIAS` (e.g. `bookings@flost8.lk` configured as a Gmail send-as alias)
- `WHATSAPP_FALLBACK_NUMBER`

Calendar IDs are NOT stored in Script Properties — they come from the `artists` tab so the operator owns the list.

## 9 · Email templates

### 9.1 Booker auto-reply

```
From: FLOST8 <bookings@flost8.lk>
To: <organizer_email>
Subject: We got your FLOST8 inquiry — <artist display>, <event date>

Hi <organizer name>,

Got your inquiry for <venue · city · event date>.
We read every one by hand. Expect a reply within 24 hrs.

If the date is inside 72 hours, WhatsApp us: <WHATSAPP_FALLBACK_NUMBER>.

— FLOST8
flost8.lk
```

Sent to the `organizer_email` captured on the form (field 9, required).

### 9.2 Owner notification

```
From: FLOST8 <bookings@flost8.lk>
To: <OWNER_EMAIL>
Subject: [LEAD] <artist display> · <event date> · <venue>

New site inquiry — Stage 2 (Qualified).

  Artist:     <artist display>
  Date:       <event date>
  Venue:      <venue>, <city>
  Type:       <event type>, <set duration>h
  Organizer:  <organizer name>, <direct number>, <organizer email>
  Lineup:     <other artists or TBD>
  Setup:      <console + setup>

Open in sheet: <direct row URL>
```

## 10 · Roster auto-sync on homepage

Per user direction, auto-sync is in launch scope. Implementation plan:

- The current roster grid in `flost8 website.html` (lines ~512–534) has hardcoded `.a-card` elements per artist.
- Replace with a single `<div id="roster-grid" class="roster-grid rv d1"></div>` container.
- On `DOMContentLoaded`, page fires `fetch('<APPS_SCRIPT_URL>?action=roster')`. Result populates the container with one card per artist following the existing `.a-card / .a-over / .a-name / .a-role` markup pattern. `role` hardcoded to `DJ / Producer` until a role column is added to the `artists` tab.
- Each card gets a tiny overlay link `BOOK →` that deep-links to `/bookings?artist=<slug>`.
- Loading state: shimmer placeholders sized to `.a-card` aspect ratio.
- Error state: fall back to a minimal hardcoded list of the 3 current artists as a failsafe so the homepage is never broken if Apps Script is down. This guard is the only reason to keep artist data mirrored in HTML — it is static text, no images, purely a worst-case fallback.

## 11 · Deploy plan

### 11.1 Branching

- All work on branch `v2` off `master`.
- No commits to `master` until cutover.
- On launch day, merge `v2` → `master` and tag `v1.0`.

### 11.2 Hosting

- **Vercel** (free tier) linked to the Git repo. Preview URL per push on `v2`. Production deploy on push to `master`.
- **Domain** `flost8.lk` added in Vercel → registrar DNS updated (A record + CNAME for `www`). SSL via Let's Encrypt, auto-issued by Vercel.

### 11.3 Apps Script deploy

- Script project created under the owner's Google account that owns the Bookings Sheet and the calendars.
- Script deployed as Web App — execute as `Me` (owner), access `Anyone`.
- Web App URL copied into repo at `config.js` (tiny file exposing `window.FLOST8_API_URL`).
- A time-driven trigger is installed for the email retry drain (every 15 min).

### 11.4 Turnstile

- Free Cloudflare account.
- Site key public, embedded in page HTML.
- Secret key stored in Apps Script `TURNSTILE_SECRET` only.

## 12 · Edge cases

| Scenario | Behaviour |
|---|---|
| Apps Script endpoint slow / down | Upcoming list shows `Loading…` then `Calendar temporarily unavailable`. Form shows banner `Submissions paused, try again in a few minutes` + WhatsApp link. Homepage roster falls back to static list. |
| Visitor offline after page load | Submit attempt shows `You appear offline — tap to retry.` Form values retained. |
| Calendar empty | Copy: `No upcoming shows yet — inquire below to book one.` |
| Double-submit | Button disables after first click until response arrives. Server dedupes on `(phone, date, normalised_venue)` within 5 minutes. |
| Turnstile fails to load | Form still submits; server enforces stricter rate limit (2/hr per IP) as fallback. |
| Invalid `?artist=<slug>` | Falls back to `any`. No user-visible error. |
| Past event date submitted | Client date picker min = tomorrow; server re-checks. |
| Gmail quota exhausted | Row already in Sheet; email enqueued in `email_retry`; retried by trigger every 15 min. |
| Artist deactivated mid-session | Server stores submitted slug anyway as `slug_unknown`; owner email flags it. Dropdown refreshes on next cache expiry. |
| Venue spelled differently across two artists' calendars | Normalisation (lowercase + strip punctuation + collapse whitespace) before merge key. Residual misses surface as two rows instead of one — minor cosmetic bug, not a data bug. |

## 13 · Risks and watchlist

1. **Gmail daily quota** (1,500/day). A viral moment could spike inquiries past this. Mitigation: `email_retry` tab + 15-min trigger absorbs spikes; Sheet rows never lost. Watch: Google Workspace admin alerts.
2. **DNS cutover on launch day.** `.lk` registrars can be slow. Mitigation: stage on `staging.flost8.lk` a day early; only flip apex at go-live. Watch: `dig flost8.lk` and Vercel's domain status panel.
3. **Calendar merge misses due to venue naming drift.** `"Warehouse 21"` vs `"Warehouse21"` currently merge; `"Warehouse 21 "` with trailing space is handled by normalisation. Less common spellings (`"WH21"`) will not merge and will show as two rows. Mitigation: tight venue-naming convention documented for the operator; flagged as acceptable cosmetic risk at launch.

## 14 · Decisions log

| Decision | Choice | Alternatives ruled out |
|---|---|---|
| Scope | New standalone `bookings.html` linked from nav | Section on single page; multi-page replacement |
| Calendar render | Apps Script API read → custom branded list | GCal iframe; custom month-grid |
| Public event data | date · artist · venue · city · time (no lineup) | Full detail with lineup; minimal date-only; time-gated reveal |
| Backend | Vercel + Apps Script (single web app) | Apps Script + Zapier; Vercel Serverless Functions |
| Per-artist self-select | Deferred to v1.1 | Cal.com real integration at launch; custom widget at launch |
| Hosting + domain | Vercel + flost8.lk | Netlify; GitHub Pages |
| Artist → event mapping | Separate calendar per artist | Title prefix; description-field tag |
| Spam protection | Cloudflare Turnstile | hCaptcha; honeypot-only; none |
| Email confirmation | Booker auto-reply + owner notification; form captures `organizer_email` as a required field | Owner-only; booker-only; none |
| Artist rename | Field and column renamed `Artist` (not `Preferred artist`) | — |
| Roster onboarding | Sheet `artists` tab drives everything | Hardcoded HTML; per-artist Markdown file |
| Roster auto-sync on homepage | In launch scope (was initially deferred) | Defer to v1.1 |
| Freeze policy | `flost8 website.html` on master is frozen; v2 branch modifies it for roster auto-sync; merge on launch | Parallel `index.html`; permanent freeze |
| Video content | v1.1; hosted on Google Drive + `content` Sheet tab | Instagram embed; Cloudinary; launch-scope |

## 15 · Success criteria

Launch is successful when:

- [ ] `flost8.lk/bookings` loads in under 1.5s on a mid-tier mobile.
- [ ] Upcoming shows list reflects Google Calendar state within 5 minutes of any calendar change.
- [ ] A submitted test inquiry appears as a new row in the Bookings Sheet tagged Stage 2 within 10 seconds.
- [ ] Owner receives an email per submission within 30 seconds.
- [ ] Booker receives an auto-reply to the email they submitted within 30 seconds.
- [ ] Spam submissions via a headless browser without a Turnstile token are rejected with HTTP 429.
- [ ] Adding a new row to the `artists` tab makes that artist appear in the roster grid, in the bookings dropdown, and in the upcoming list (once they have events) within 5 minutes — with no code deploy.
- [ ] Existing WhatsApp and Instagram booking flows operate unchanged.
- [ ] `flost8 website.html` on `master` is identical to pre-launch until the v2 merge.

## 16 · Timeline (1-week MVP)

| Day | Work | Owner |
|---|---|---|
| 1 | Create 3 Google Calendars + share with script account. Seed `artists` tab in Bookings Sheet. Upload 3 photos to `photos/`. | Owner |
| 2 | Build Apps Script Web App; deploy to staging URL; manual test GET + POST endpoints. | Dev (Sonnet subagent) |
| 3 | Build `bookings.html` — layout, form, Turnstile, fetch upcoming. | Dev (Sonnet subagent) |
| 4 | Update `flost8 website.html` on `v2` — dynamic roster grid, new `BOOKINGS` nav tab, static-fallback roster markup. | Dev (Sonnet subagent) |
| 5 | End-to-end test on Vercel preview URL — 3 fake inquiries end-to-end; verify rows + emails; verify roster + calendar sync. | Owner + Dev |
| 6 | DNS cutover `flost8.lk` → Vercel; issue SSL; final pre-launch pass. | Owner |
| 7 | Merge `v2` → `master`, tag `v1.0`, launch. Monitor Sheet for first 24 hrs. | Owner |

Three-day buffer before the ~2026-05-06 hard launch.

## 17 · v1.1 backlog (not in this spec, scoped lightly for forward compatibility)

- **`watch.html`** — media page. Short-form video hosted on Google Drive; live sets via YouTube embed. New `content` Sheet tab (`slug, artist_slug, type, media_url, thumbnail_url, caption, pinned, active, date`). Same cache/fetch pattern as roster.
- **Per-artist Cal.com-style self-select page** — `/artists/<slug>` with a time-picker reading the artist's calendar and auto-pre-filling the inquiry form with the selected slot.
- **Month-grid calendar view** — optional alternate rendering of the upcoming list.
- **Email field** — already in launch scope (see §6.1 field 9); listed here in v1.1 backlog only for a future enhancement such as email-based lead enrichment.
- **Auto-sync of role/bio** in addition to photo in `artists` tab.

---

**End of spec.**
