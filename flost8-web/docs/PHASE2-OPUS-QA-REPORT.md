# Phase 2: independent review and QA report

Branch `claude/phase2-opus-verified`, cut from `origin/claude/phase2-integrated` at `4557caf` (the builders' final report).
Reviewed against `origin/booking-manager` (`828e0a9`, last reviewed baseline) and `origin/master`.
Nothing was pushed anywhere else. No pull request. No database, no Supabase, no deploy, no `.env`, no `apps-script/` edits.

The diff against `master` is the whole booking-manager app (429 files); the review covered the Phase 2 part on top of `828e0a9`
(73 files: T7 shortcuts, T8 Nudge, T9 list actions, T10 snooze, migration 012, guides, report).

## 1. Verify rounds

Commands every round: `npm ci` (fresh), `npx tsc --noEmit -p .`, `npx tsc --noEmit -p tsconfig.app.json` (added: `-p .` checks
no app code, see note), `eslint src functions`, `vitest run`, `npm run build`, then with `npm i --no-save @electric-sql/pglite`:
`contacts_rls.proof.mjs`, `contacts_scripts.proof.mjs`, and the new `phase2_security.proof.mjs` (it also applies the whole
migration chain 001..N in order on a fresh in-memory Postgres and checks the files are numbered with no gap or duplicate).

| Round | Code | tsc (root / app) | eslint | Tests | Build | Proofs (rls / scripts / security) | Result |
|---|---|---|---|---|---|---|---|
| 1 | `4557caf` (as delivered) | clean / clean | clean | 33 files, 384 passed | ok | 118 / 28 / **36 of 37** | **Fail**: contact_stats leak (D1) |
| 2 | `dc3b81a` (fixes D1 to D8, guides) | clean / clean | clean | 34 files, 392 passed | ok | 118 / 28 / 37 | Clean |
| 3 | `9805987` (final app code), fresh clone + `npm ci` | clean / clean | clean | 34 files, 392 passed | ok | 118 / 28 / 37 | Clean |
| 4 | `9805987` again, second fresh clone | clean / clean | clean | 34 files, 392 passed | ok | 118 / 28 / 37 | Clean |

Between rounds 2 and 3 the code changed (D8 phone wrap, D9 calendar a11y), so round 2 does not count toward the final pair.
Rounds 3 and 4 are two consecutive clean rounds on identical code. The only commit after them is this report.

Note: `tsc --noEmit -p .` uses a references-only root config and type-checks nothing; `npm run build` (`tsc -b`) and
`tsc -p tsconfig.app.json` are the real checks. Both were run every round.

The migration chain 001..013 applies in order with no error on a fresh PGlite every round (a duplicate `create` would abort it).

## 2. Defects found and fixed

Severity: High = data a person must not see, or wrong data saved. Medium = a feature does the wrong thing in normal use.
Low = edge case, wording, scale or polish.

| # | Sev | Where | What was wrong | Fix | Proof |
|---|---|---|---|---|---|
| D1 | **High** | `contact_stats()` (migration 010, live in production) | Security definer, counted every inquiry linked to a contact. A sales manager saw the count, next booked date and last-touch time of the other manager's shows, which RLS (since 005) hides from them. Contacts are shared, so any shared venue or promoter leaks. | New migration **013** (not applied): an inquiry is counted only when `can_view()` allows it. Owner still sees all. | `phase2_security.proof.mjs`: failed on 001..012, passes with 013 |
| D2 | Medium | `Workspace.tsx`, `InquiryList.tsx`, `CalendarView.tsx` | "Today" was computed once (memo on `[mySlugs]`, and a module-level constant in the list). A phone tab left open past midnight snoozed **Tomorrow** to the day that had already started, so the row came straight back; year and Past headings and contact stats also went stale. | `useToday()` hook (re-checks every minute and when the tab is shown); passed down as a prop. | `useToday.test.tsx`; browser test at 23:58 then 00:03 Colombo: **fails on `4557caf`** (saved 2026-10-09), passes now (2026-10-10). See `docs/qa/`. |
| D3 | Medium | `rowActions.ts` `duplicateInput` | Duplicate of a **Deposit paid** show kept that status, but no deposit is copied: the new date claimed a deposit nobody paid (and would auto-publish). | A copy of Deposit paid starts as **Booked**. Fee is still copied, deposit never. | `rowActions.test.ts` |
| D4 | Medium | `NudgeControl.tsx` | Once a WhatsApp number was saved there was no way to change or remove it in the app. A mistyped but valid number was stuck. | **Change number** next to Nudge; the form is prefilled and has **Remove number**. | `nudgeUi.test.tsx` |
| D5 | Low | `nudge.ts` `nudgeUrl` | A number saved as `0094…` became `94094…` (dead wa.me link). `waLink` already handled `00`. | Same rules as `waLink`. | `nudge.test.ts` |
| D6 | Low (scale) | `contactsApi.ts` `fetchContactStats` | The 1000-row response cap also applies to rpc results. Past 1000 contacts the rest silently lost their stats (stage, counts). | Paged like `fetchContacts`. | `contactsApi.test.ts`; browser run with 1206 contacts |
| D7 | Low | `AddEventDialog.tsx` | The owner (Anuda) was told "Money stays visible only to you and Anuda." | Owner sees "...only to you and <manager>". | browser |
| D8 | Low | `InquiryList.tsx` | At 400px, with the new tick box and menu button, event names were cut to a few letters ("Joint …"). | Names wrap to two lines. | `docs/qa/mgr-all-phone.webp` |
| D9 | Low | `CalendarView.tsx` | The invisible hover "+" on every empty calendar day was in the accessibility tree: a screen reader heard about 30 extra "Add event on ..." buttons. | `aria-hidden` on the mouse-only button; the button under the grid is the accessible path. | `navUi.test.tsx` |
| D10 | Low | migration 012 | Not wrapped in a transaction: a failure part-way in the SQL editor could leave half of it applied. | `begin; ... commit;` (012 is not applied yet). | proofs |

Claims in `PHASE2-FINAL-REPORT.md` that I re-checked and found true: 384 tests, 118 and 28 proof checks, tsc/eslint/build clean;
whatsapp column hidden from table reads, embedding and WHERE; both whatsapp functions refuse anon and managers; a manager can
change only `contact_id` and `snoozed_until` on their own sheet row (my proof tries every column of `inquiries`); sheet rows have
no tick box and no Set status; snooze does not bump `updated_at`; Resync says it is switched off when the server says `disabled`;
Enter on a Needs row opens and keeps the drawer open; menu keyboard support works (Esc returns focus to the button).
Their report missed D1 to D10.

## 3. Security recheck (attacker view)

New proof `supabase/proofs/phase2_security.proof.mjs`, 37 checks, run as anon, as each sales manager and as the owner.

- (a) `managers.whatsapp`: not readable by column, `select *`, whole-row `to_jsonb`, an embedded sub-select under `inquiries`,
  `order by` or `where`, for managers **and** the owner. No view exposes it. Only `manager_whatsapps()` and
  `set_manager_whatsapp()` touch it. Also checked live in the browser from Kasuni's own session: every route refused.
- (b) Sheet rows: a manager can change only `contact_id` and `snoozed_until` on their own sheet row. Every other column is refused.
- (c) anon can execute **no** public function. A sales manager cannot run `set_inquiry_publish_hold`, `purge_old_contacts`,
  `link_intake_contact`, `manager_whatsapps` or `set_manager_whatsapp`. The list of functions a signed-in user may execute is
  pinned, so a new one cannot slip in unnoticed. (I first suspected `purge_old_contacts` was open to managers; the proof showed
  migration 002 had already removed the default execute grant. Not a defect.)
- (d) No money or inquiry of another manager's artist leaks through snooze or the bulk path (RLS filters the rows; checked).
  `contact_stats` **did** leak (D1, fixed by 013).
- (e) `publish-show` is unchanged in this diff. Its 32 tests pass: fails closed when the event read errors, leaves a held-back
  event off the site without claiming anything, does nothing unless `WEBSITE_PUBLISH` is `on`, rejects bad tokens (401) and
  other managers (403).
- (f) Every `href` in the new UI has a fixed `tel:`, `mailto:`, `https://wa.me/`, `https://instagram.com/` prefix, or is a
  database-checked `http(s)` link (ticket link, contract link). The database refused a `javascript:` ticket link when I tried
  to seed one. Event names with `<script>` render as text. No keys or tokens in the diff. Phone numbers in tests are the
  usual placeholders (`0771234567`, `+94770000001`); the guides use made-up data only.

## 4. Browser QA

How: a throwaway fake of the Supabase client (untracked, `tmp/qa/`, behind a Vite plugin) that runs the **real migrations with
real RLS** in an in-browser Postgres (PGlite) and signs in as the owner or Kasuni. Data is invented. Headless Chromium
(Playwright), timezone Asia/Colombo. `/api/publish-show` stubbed to answer `disabled`.

Final run on the final code: **78 of 78 steps passed, no page errors.**

| Run | Steps | Covered |
|---|---|---|
| Owner, 1280px | 23 / 23 | Overview tiles and where each leads; Team follow-ups; filters and view remembered after reload; search and `/`; `N` (and not while typing, not inside a drawer or an open menu); arrows + Enter + visible focus ring; row menu items for website vs sheet rows, Esc returns focus; Set status with Undo and commit; Snooze Tomorrow, Snoozed till label, Unsnooze; snooze a sheet row; snoozed row dimmed on Overview; Duplicate (date blank, Booked, asks for date); bulk Mark spam; Calendar tap a day, Add event on that day prefilled; Add event with the contact picker (contact linked, new event opens); Nudge: bad number message, save, wa.me link and text (no phone or email in it), Change number; Contacts search, Merge duplicates and Undo; Trash and Restore; contact card note; WhatsApp sheet template link; no horizontal scroll on any screen |
| Owner, 400px | 23 / 23 | the same steps at phone width (bottom tab bar) |
| Manager (Kasuni), 1280 and 400px | 21 / 21 | Today boxes; sees only her artists' shows (plus the joint bill with her artist); from her session cannot read `whatsapp` or call owner functions; no Nudge, Resync or team chips; sheet row has no tick box and no Set status, has Edit in sheet, can be snoozed; sheet-row drawer has no Edit event; bulk bar and Clear; Contacts, contact card, reminder; Calendar; every visible button, link and tick-box label is at least 44 x 44 px |
| Edge cases | 11 / 11 | contacts fail to load: banner and Try again; inquiries fail to load: error and retry; corrupt and old-shape localStorage ignored; blocked localStorage (throws) still works; tab left open past midnight (D2); 1206 contacts all load and #1200 is searchable; partial bulk failure: "1 of 2 updated, 1 not allowed", the allowed row changed; empty filter result and its way out; text contrast at least 4.5:1 (3:1 large) on all five owner screens; Tab order with a visible focus ring on 40 stops; prefers-reduced-motion leaves no transition or animation running |

Screenshots (small WebP, fake data): `docs/qa/`. The guide pictures that changed were refreshed in `docs/guides/screens/`
(`owner-nudge-ready-desktop`, `owner-duplicate-desktop`, `mgr-all-phone`, `mgr-row-menu-phone`).

Defects seen in the browser: D2 (`docs/qa/` midnight run log), D7, D8 (`mgr-all-phone.webp`), D4 (`owner-nudge-ready-1280.webp`
now shows Change number). Everything else in the table passed first time once my own test selectors were right.

## 5. Guide audit

I checked 44 concrete claims across `OWNER-GUIDE` and `SALES-MANAGER-GUIDE` (button names, steps, what you see, who can do
what) against the code and the browser runs. 35 were right. Fixed in both `.md` and `.html` (rebuilt with
`scripts/build-guides.mjs`):

1. "Every action can be undone for 5 seconds": not true for Call, Duplicate, Open details or Unsnooze. Now names the five that can.
2. Unsnooze happens at once with no Undo. Added.
3. On a Thursday there is no **Friday** snooze button (tomorrow is Friday). Added.
4. Manager guide said the new event "says Will be added to your list". That text is in the Add window before saving. Fixed.
5. Owner guide said the same about "who will own it". Fixed.
6. Duplicate: it also copies the status, never deposits, and a Deposit paid copy starts as Booked (D3). Both guides.
7. Nudge: how to change or remove a saved number (D4). Owner guide.
8. The menu count next to Team follow-ups also counts due reminders, so it can be higher than the tile. Owner guide.
9. "You see your own artists' events" left out shared shows that include one of your artists. Manager guide.
Also: "If it goes wrong" under Reminders described normal behaviour (reworded), and the owner's to-do list now names both
database updates (012 and 013).

Readability: short sentences, plain words, numbered steps, every button name in bold exactly as on screen. A first-time user
could follow both on a phone. The HTML files are self-contained and work offline.

## 6. What I could NOT verify

- A real phone (touch, phone keyboard, safe-area bar). 400px was a narrow desktop browser with touch enabled.
- Real Google sign-in and the live allow-list.
- The live database. Migrations 012 and 013 ran only in PGlite. The column-level grant on `managers` is standard Postgres,
  but it is proven here only in PGlite.
- The real WhatsApp handoff: I checked the wa.me addresses and texts, not that WhatsApp opens with them.
- Screen readers (VoiceOver, TalkBack, NVDA). I checked roles, names, focus order and focus rings only.
- Website publishing end to end (needs live Apps Script and `WEBSITE_PUBLISH`).
- The guides have not been read by the people they are for.

## 7. Residual risks (not fixed, on purpose)

- `touch_updated_at` (since 010) keeps a client-sent `updated_at` when nothing else changes, so a manager using the API
  directly could make their own app-added or website row look touched and drop it from Needs you. Needs deliberate API use and
  only works on rows they may already edit. Pre-existing; worth closing at the cutover.
- `fetchInquiries`, `fetchLastTouch` and open reminders still read at most 1000 rows. Fine at today's volume (hundreds), not at
  thousands.
- The fake client used for QA is not PostgREST. Query shapes were matched by hand; RLS and triggers are the real ones.
- Contact numbers in tests follow the common `077 123 4567` placeholder pattern from the baseline.

## 8. What only the owner can do next

1. Read migrations **012** and **013**, then apply them to the live database in that order (013 closes D1, which is live now
   because 010 is applied). Until 012 is applied, Snooze and WhatsApp numbers will not work.
2. Deploy to the dev preview and click through once with the real Google accounts, on a real phone.
3. Add each manager's WhatsApp number (Overview, Managers, Add WhatsApp number).
4. Switch on `WEBSITE_PUBLISH` only when you want app events on the public Shows list.
5. Later: switch the sheet importer off before the contacts cutover (script 011).

## 9. Rating: 8 out of 10

What earns it: the as-delivered branch was re-verified from scratch and its numbers reproduced; a real privacy leak that is
live in production today (D1) was found, proven with a failing check and fixed in migration 013; nine more defects were fixed at
the root with a test each; the browser QA ran the real migrations and real RLS (not a hand-written fake that trusts the UI),
78 of 78 steps at two widths and two roles on the final code; the guides were audited claim by claim and fixed in both formats;
two consecutive clean verify rounds on identical code from fresh clones.

Missing 2 points:
- **-1: nothing touched the real thing.** No real phone, Google sign-in, live database, WhatsApp or screen reader. Migrations
  012 and 013 are proven only in PGlite, and the fake client is not PostgREST.
- **-1: open items I chose not to fix here.** The forgeable `updated_at` (section 7) and the 1000-row reads of inquiries,
  last-touch and reminders. Both are small today but they are real, and D1 shows that a fully proven baseline can still hide a leak.
