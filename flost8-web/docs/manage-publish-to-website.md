# App events → public Upcoming Shows

## Verified implementation — 2026-10-07

Built locally on `booking-manager`, uncommitted. Migration 009 applied once through hosted Composio account FLOST8 to Bookings Backend (`ybeenrpelytyohpyurzn`). Read-only verification confirmed both inquiry columns, ticket URL/length constraint, mapping RLS enabled, no mapping FK (survives deletion), guard trigger present, authenticated table writes/RPC execution denied and service-role RPC execution allowed. Mapping row count: **0**. Apply execution `log_saG16OS3G8Xd`; verification `log_94nr6kY-DHzB`.

Checks passed: `npm run type-check`, `npx eslint src functions`, `npm test -- --maxWorkers 1` (**212 tests, 21 files**), `npm run build`, explicit strict TypeScript check of the Function. The final DOM test assertion was adjusted to use the disabled attribute (project TypeScript does not register the toBeDisabled matcher type); its two tests passed again after that adjustment.

Added 28 tests: mapper (10), Function fake-fetch (15), ticket link validation/persistence (1), toast/owner resync DOM (2). They cover status/source gates, exact public whitelist including no private fields, dates/URLs, B2B duplicates, auth/ownership, generated ID storage, deletion cleanup, update/unpublish, uncertain add/concurrent-call protection and timestamp-only updates.

Not verified: deployed Pages environment names/values, actual Google sign-in or authenticated browser, desktop/mobile visual rendering, real Apps Script request/response against deployed code, or fake-event T5. No website requests or Shows writes; no push/deploy. Existing unrelated edits were preserved.

## Contract

Files added: `functions/api/publish-show.ts`, `functions/api/publish-show.test.ts`, `src/lib/manage/publicShow.ts`, `src/lib/manage/publicShow.test.ts`, `src/lib/manage/publishShow.ts`, `src/pages/manage/publicationUi.test.tsx`, `supabase/migrations/20261007_009_ticket_link.sql`, this handoff.

Files updated: `src/lib/manage/api.ts`, `newEvent.ts`, `newEvent.test.ts`, `types.ts`, `testFixtures.ts`; `src/pages/manage/AddEventDialog.tsx`, `InquiryDrawer.tsx`, `Shell.tsx`, `Workspace.tsx`, `ui.tsx`. Vault plan/STATUS/session log updated separately.

Only `manual` inquiries with `booking_confirmed` or `deposit_paid` publish. Missing/invalid date, artist, venue line or city means no public row. The sheet receives only date, time, venue, city, artist, artist_display and ticket_link. Event name supplies the venue line, falling back to venue. Artist lineup order is preserved, joining names with ` B2B `. Unsafe or oversized ticket URLs are never exported. Past ISO dates remain in the sheet but the existing website normalizer hides them using UTC today.

App save happens first. Create/edit, drawer status/delete, and the reached-out quick action then call `/api/publish-show` with the Supabase access token. Failed website updates retain a Retry toast. The owner can run Resync website; it pages through manual events AND surviving publication mappings, three IDs per request.

## Generated-ID fallback

The supplied admin.gs always generates the show ID. `website_publications` records that ID and survives inquiry deletion; `inquiries.website_show_id` is its display copy. The table and claim/finish RPCs are service-role-only. The Function verifies the caller through Supabase Auth, finds a manager row, and explicitly checks owner role or inquiry ownership. A missing inquiry may be cleaned up by any manager. Imported events and website leads never publish through this path. Only mapped rows are updated/deleted; `sync:` rows are never mutated. A synced row matching the date and any lineup member suppresses the app duplicate.

Claims serialize publication of an inquiry for two minutes. Before addShow, the durable phase becomes `adding`. A lost/invalid response or failed mapping persistence leaves that phase in place: automatic retry/resync blocks a second add. Updates/deletes can safely retry. Public content is checked again after publication so concurrent edits/deletion are surfaced for Retry.

## An uncertain add requires owner reconciliation

The existing Apps Script API has no idempotency key. Automatic recovery of a lost add response cannot safely identify an arbitrary UUID show. The Function returns an explicit attention message; it never guesses from content or blindly adds again.

An operator must inspect the Shows sheet and the relevant mapping with authorized read access. If the returned/actual ID is known, record it in the mapping (and inquiry display copy if present), reset phase to idle and clear an expired claim, then retry/resync. If no show was created, reset phase only after confirming that fact. Do not delete or adopt unrelated UUID rows. Changes to this live state require the owner's authorization. No reconciliation was run in this implementation session.

## Configuration and release

Pages preview AND production need server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET`, `APPS_SCRIPT_URL`. The Function uses the same server-to-Apps-Script protocol as `/api/admin`, with Supabase authentication instead of ADMIN_PASSWORD. Never ship the service key/secret in Vite variables.

Migration: `supabase/migrations/20261007_009_ticket_link.sql`; 008 stays unchanged. This introduces nullable columns, the private mapping table, restricted RPCs and a guard against forged client mappings. No existing events are published by applying it. Deployment is a separate action. Dev uses live Shows/Supabase: no browser against live /manage, Resync, or fake-event T5 may run without its explicit authorization.

Tests use fake network responses and DOM fixtures; no live Shows request is part of validation. Apps Script files, Shows.tsx, showsAdmin.ts, bookingContract.ts and AdminPage.tsx are outside this patch.
