# Phase 2 final report: /manage bookings app

Branch: `claude/phase2-integrated` (cut from `booking-manager` at 828e0a9). Nothing was pushed to any other branch. No pull request was opened.

## What was built, per ticket

| Ticket | What it is | Where it came from |
|---|---|---|
| Earlier contacts work (context only) | Contacts, Today screen, merge and undo, reminders, WhatsApp templates (migrations 010 and 011) | already on `booking-manager` |
| **T7** | Navigation shortcuts: tiles open the matching list, the open view and filters are remembered per person, tapping a calendar day offers Add event on that day, laptop keys (`/`, `N`, arrows, Enter) | `cloud/t7-shortcuts` |
| **T8** | Owner Nudge: a WhatsApp button per manager with the message already written. Numbers are read and saved only through two owner-only database functions | `cloud/t8-nudge` |
| **T9** | List actions: a row menu with Duplicate, Set status and Snooze; tick boxes with bulk Mark lost / Mark spam; Needs you cards use the same menu | `claude/t9-t10-list-actions-snooze` |
| **T10** | Snooze (hide a row from Needs you until a day, the owner sees snoozed rows dimmed on Overview) and migration 012 (snooze column, manager WhatsApp column, two owner-only functions) | same branch |

## How it was built

1. Cut `claude/phase2-integrated` from `booking-manager`.
2. Merged T7, then T8: both merged with no conflict.
3. The T9/T10 branch did not exist when the run started. It appeared while the run was polling (every 3 minutes), with its migration file, and was merged third.
4. That merge conflicted in `Workspace.tsx` and `AddEventDialog.tsx` (T7 passed a calendar date to Add event, T9 passed a full set of starting values for Duplicate). Resolved by keeping both: Add event now takes one `initial` value, and a calendar day just sets its date.
5. Contract checks, a verify loop, an adversarial review, browser QA, two guides and this report.

## Contract checks

| Check | Result |
|---|---|
| (a) `nudgeApi.ts` vs migration 012: `manager_whatsapps()` returns `manager_id, whatsapp`; `set_manager_whatsapp(p_manager, p_whatsapp)` | **Match.** Locked in by a test that reads both files (`phase2Integration.test.tsx`) |
| (b) T7 shortcut guard suppressed while the row menu, snooze picker or any dialog is open | **Guard already looked for the right roles** (`menu`, `dialog`, `listbox`, expanded `aria-haspopup`). Added a test that opens the menu, the Snooze choices and the date input and checks `N`, `/` and arrows do nothing |
| (c) `data-row-id` on every list, arrows move, Enter opens | **Was broken, fixed.** See findings 1 and 2 below |
| (d) `snoozed_until` through type, `fetchInquiries`, fixtures, `needsAction`, filters, the owner's dimmed row | **Present everywhere.** `fetchInquiries` also falls back cleanly when migration 012 is not applied yet. Owner's dimmed rows appear on Overview under Team follow-ups |
| (e) Sheet-imported rows can never be status-edited or bulk-changed from the UI | **Holds in three places**: no Set status in the menu, no tick box, and (new) both handlers refuse again at run time. The database trigger also refuses (proof run) |
| (f) Migration numbering | **012 follows 011, 1 to 12 with no gap or clash.** A test checks it |

## Verify loop

Commands each round: `npx tsc --noEmit -p .`, `eslint src functions`, `vitest run`, `npm run build`, and the two PGlite proofs.

| Round | Result | What happened |
|---|---|---|
| 1 | **Failed** | `npm run build` failed (my new test had type errors; note `tsc --noEmit -p .` does not check the app code, only `npm run build` does). One new test had a bad regex. Review found real bugs (findings 1 to 5). All fixed |
| 2 | Clean | tsc, eslint, 381 tests, build, proofs 118 and 28 |
| 3 | **Failed** | A proof check ("sheet row updated_at never moved") failed under CPU load. Cause: the check compared timestamps at one-second precision, but the proof's own importer step legitimately moves `updated_at`. Fixed the proof (it now checks only what signed-in users do after that step). Passed 12 of 12 reruns under load, including 6 under heavy load |
| 4 | Clean | 381 tests, proofs 118 and 28 |
| 5 | Clean | same |
| 6 | Clean | after the browser-QA fixes (findings 6 and 7): 381 tests, proofs 118 and 28 |
| Final head check (outside the loop, because I changed code after round 6) | Clean | 33 test files, **384 tests**, tsc, eslint, build, **118** + **28** proof checks |

Honest note: rounds 4, 5 and 6 were clean in a row, but the code changed between 5 and 6 and again after 6 (finding 8), so the last two clean runs are not on identical code.

## Findings and fixes (adversarial review and browser QA)

1. **Arrow keys stuck on All inquiries.** Two elements carried the same `data-row-id` and the wrapper could not take focus. Fixed: one focusable element per row (`focusableRows`), with a test.
2. **Needs you, Team follow-ups and Today rows could not be reached or opened by keyboard.** Rows are now focusable (not a tab stop), and Enter on the card opens it. Overview rows were added too. Tests added.
3. **Row menu keyboard support was missing.** Added arrow keys, Home and End, Escape returning focus to the button, Tab closing the menu. Test added.
4. **Status and bulk handlers trusted the menu.** Both now re-check that a row may be status-edited before queuing a write.
5. **Nudge link for a number starting with 0.** `wa.me` needs a country code, so a local number (0771234567) made a dead link. A number with no `+` and a leading 0 now becomes 94… (same rule as the existing WhatsApp links). Test added.
6. **Found only in the real browser:** pressing Enter on a Needs row opened the drawer and then closed it at once (the same Enter also pressed the drawer's focused Close button). Fixed with `preventDefault`. A unit test now checks the event is default-prevented.
7. **Tap targets under 44px:** the Upcoming/Past/All dates buttons (40px) and a Delete link on contact notes (32px). Both are now 44px. Snoozed rows on Overview also got a 44px tap target.
8. **Resync said "Website list updated" while website publishing was switched off** (the server answers `disabled`). It now says: "Website updates are switched off right now, so nothing was changed." Test added.

Security review of migration 012 (read the SQL and run in the proof, 118 checks): a manager cannot read `managers.whatsapp` (not by column, not by WHERE); anon cannot call either function (checked); the owner reads numbers only through the function; a manager can change only `contact_id` and `snoozed_until` on a sheet row and every other column is refused, even next to a snooze; snoozing does not touch `updated_at`; a manager cannot snooze another manager's row. localStorage is wrapped in try/catch everywhere (it is only used in `navState.ts`, with tests for blocked and junk storage). No secrets or real phone numbers were added (a text search of the diff found only made-up test numbers).

## Browser QA

Ran with headless Chromium (Playwright) against a throwaway in-memory fake of the Supabase client (kept in an untracked `tmp/preview/`, not committed), at 1280px and 400px, as signed-out, owner and sales manager. **46 of 46 steps passed, with zero page errors.** Covered: sign-in screen, Overview tiles and tile shortcuts, remembered view after reload, Team follow-ups, arrow keys + Enter, row menu, snooze, Nudge (add a number, then the link points to the right wa.me address), `/` and `N` shortcuts and the guard while a menu is open, status picker, Duplicate, bulk Mark spam, sheet rows have no tick box and no Set status, Calendar tap-to-add and saving an event with the contact picker, Contacts list, contact card, merge dialog, Trash, Today screen, WhatsApp window, contact card, a manager not seeing the other manager's booking or Nudge. 28 small WebP screenshots (558 KB in all, fake data only) are in `docs/guides/screens/`. The browser QA ran on the code just before finding 8; that change only touches the Resync message and has its own unit test.

## Files added

Guides: `docs/guides/OWNER-GUIDE.md` and `.html`, `docs/guides/SALES-MANAGER-GUIDE.md` and `.html`, 28 files in `docs/guides/screens/`, and `scripts/build-guides.mjs` (rebuilds the HTML from the Markdown). This report.

From the tickets: `src/lib/manage/` `navState.ts`, `nudge.ts`, `nudgeApi.ts`, `rowActions.ts`, `rowMenu.ts`, `snooze.ts` (each with tests); `src/pages/manage/` `NudgeControl.tsx`, `RowMenu.tsx`, `useManagerWhatsapps.ts`, `navUi.test.tsx`, `nudgeUi.test.tsx`; `supabase/migrations/20261007_012_snooze_and_manager_whatsapp.sql`.

Added in this integration: `src/pages/manage/phase2Integration.test.tsx`, `src/lib/manage/publishShow.test.ts`.

Edited: `Workspace.tsx`, `AddEventDialog.tsx`, `NeedsList.tsx`, `InquiryList.tsx`, `OverviewView.tsx`, `TodayView.tsx`, `RowMenu.tsx`, `FilterBar.tsx`, `ContactDrawer.tsx`, `ManagersList.tsx`, `Shell.tsx`, `CalendarView.tsx`, `api.ts`, `needsAction.ts`, `types.ts`, `testFixtures.ts`, `nudge.ts`, `publishShow.ts`, `navState.ts`, and the proof `contacts_rls.proof.mjs` plus its README.

## What could NOT be verified

- A real phone: the 400px runs are a narrow desktop browser, not a phone (no touch, no phone keyboard, no safe-area bar).
- Real Google sign-in, and what the live sign-in allow-list does.
- The live database: migration 012 was only run in PGlite, never on the real project, and I had no access to it. How the real Supabase handles the column-level grant on `managers` is proven only in PGlite.
- Real WhatsApp handoff: I checked the link addresses, not that WhatsApp opens with the text.
- Screen readers (VoiceOver, TalkBack, NVDA). I checked roles, labels and keyboard paths in code and tests only.
- The website publishing path end to end (it needs the live Apps Script and the `WEBSITE_PUBLISH` switch).
- The guides were checked against the code line by line, but not read by a real person.
- The guide request said "Add event in three taps". That is not literally true: it needs an artist, a date, a name or venue, then Add. The guide says it plainly instead.

## What only the owner can do next

1. **Read migration 012, then apply it to the live database.** Until then Snooze will fail with "Something went wrong" and WhatsApp numbers will say "Saving numbers is not switched on yet". The dashboard itself keeps loading without it.
2. **Deploy to the dev preview** and click through it once with real accounts.
3. **Add each manager's WhatsApp number** (Overview, Managers, Add WhatsApp number). Nudge needs it.
4. **Switch the sheet importer off before the contacts cutover** (script 011). Not part of this change.
5. **Switch on `WEBSITE_PUBLISH`** if you want app events to reach the website list. It is off by default.
6. **Decide on the unbuilt KPIs plan.**

## Honest rating: 8 out of 10

Why not 10:
- Nothing ran against the real thing: no real phone, Google sign-in, live database, WhatsApp or screen reader (see above). The browser QA used a fake client.
- Two verify rounds failed before it got clean, and I changed code after the last loop round (it is covered by a final head check and a unit test, but the last two clean runs are not on identical code).
- Migration 012 is proven only in an in-memory Postgres.
- The guides have not been read by the people they are for.

What earns the 8: all three tickets merged with both behaviours kept; every contract check passed or was fixed and locked in with a test; the review found and fixed eight real problems (one only visible in a real browser); 384 tests, a clean build and 146 database checks pass; and 46 of 46 browser steps passed at two widths with no errors.
