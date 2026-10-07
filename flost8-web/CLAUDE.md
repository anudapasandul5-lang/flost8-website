# FLOST8 — Project CLAUDE.md

**Stack:** React + Vite + Cloudflare Pages. Branch `rebuild` (production = `v2`).
**Live preview:** https://dev.flost8.pages.dev
**Vault:** `Projects/FLOST8/STATUS.md`

## Skills allowed (model-enforced — Claude Code has no native allowlist)

Invoke only when relevant:
- `design-taste-frontend` — **mandatory for all UI/design decisions** (user requirement, see vault antipatterns)
- `frontend-design` — component implementation
- `animate` / `impeccable:animate` — motion enhancements
- `gpt-taste` / `gpt-tasteskill` — alternative design lens
- `taste-skill` / `taste-skill-v1` — design taste library (from `leonxlnx/taste-skill` plugin)
- `brutalist-skill` / `minimalist-skill` / `soft-skill` — aesthetic-specific lenses within taste-skill
- `redesign-skill` — targeted redesign passes on existing UI
- `stitch-skill` — component/section stitching within taste-skill
- `brandkit` — brand asset/token consistency checks
- `image-to-code-skill` — convert a reference image/mock into code
- `imagegen-frontend-web` / `imagegen-frontend-mobile` — generate UI imagery for web/mobile
- `output-skill` — output formatting within taste-skill
- `vercel:nextjs` — N/A here (Cloudflare Pages)
- `agent-browser` — preview QA
- `wiki` / `save` / `think` — vault

Decline others unless user explicit.

## Gotchas

- `wrangler` bare commands mangled by RTK hook → use `npm run` scripts (or `./node_modules/.bin/wrangler` directly)
- Cloudflare Pages project `flost8` is **Direct Upload** (no Git provider). Env var / secret changes (`ADMIN_PASSWORD` etc.) only take effect on a *new* deployment, and `/deployments/{id}/retry` fails with `8000055` for Direct Upload — you must rebuild + `wrangler pages deploy dist --project-name flost8 --branch v2`. Build from committed HEAD (stash unrelated WIP first). Prod branch = `v2`, dev branch = `dev`; secrets exist in both `production` and `preview` envs — set both.
- Shows list = "Shows" tab of Google Sheet `1uMv5zS9coUcgzn99arrZOexBbMzliBPL3Kl-GXdl_yA` (cols: id, date, time, venue, city, artist, artist_display, ticket_link). No event-name field — put party name in `venue`. `ticket_link` is optional — when set, the whole Upcoming Shows card links straight to it. Edit via `/admin` page, or `POST /api/admin {password, action:addShow|updateShow|deleteShow|listShows, ...}`, or the sheet directly (blank `id` is fine for display-only rows)
- **`apps-script/Code.gs` in this repo does NOT match the live Apps Script project.** The real project (script.google.com, project id `1mjE8qKbC_rYMrTanlc8mv761ZPfDEF3sU-PQaZJ-KyFw_rR_Py_3K5NF`) has 4 files: `Code.gs` (dead — its `doPost`/`doGet` are shadowed), `Contacts.gs`, `website.gs`, and **`admin.gs`** (the one that actually runs everything — Shows CRUD, form routing). `admin.gs` is also missing the WhatsApp-alert code that repo `Code.gs` and `apps-script/README.md` describe — unverified whether that feature is live at all. Before editing Apps Script behavior, open the live project and check all 4 files; don't trust the repo copy as ground truth. 2026-09-16 patch (`ticket_link` support) was applied by hand-editing `admin.gs` directly, not by pasting repo `Code.gs` over it.
- `apps-script/sync.gs` (booking sync, `fsync_` prefix) owns every Shows row whose `id` starts `sync:` — it rewrites date/venue/city/artist from the managers' sheets every 15 min, so edit those at the source (Kasuni's / Nirbheeth's sheet), not in `/admin`; `time` and `ticket_link` on those rows are left alone. It is a separate file in the live Apps Script project, never merged into `admin.gs`. Tests: `node apps-script/sync.test.cjs`
- `apps-script/import.gs` (`fimp_`, needs sync.gs in the same project) copies the managers' sheet rows into Supabase every 15 min, ONE-WAY: sheets win until cutover, so never hand-edit `source=sheet_import` rows in the database. Key = `tab|date|event` (Row ID is blank on most rows), so renaming an event in a sheet makes a new inquiry. Needs Script properties `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`. Tests: `node apps-script/import.test.cjs`
- `backdrop-filter` ancestor = containing block for `fixed` children → broke mobile menu
- Bookings POST to `/api/script` → handled by `functions/api/script.ts` (Pages Function forwards to Apps Script). Needs Cloudflare Pages env vars `APPS_SCRIPT_URL` + `TURNSTILE_SECRET` set in Production. Turnstile server-side verify is SKIPPED if `TURNSTILE_SECRET` unset → forms unprotected. No rate limiting yet (see vault `flost8-traffic-defense-moc`)
- Hero text split must be word-atomic (`.word` inline-block + `white-space: nowrap`), not glyph-atomic, or browser breaks mid-word
- `text-base` is a COLOR utility here (palette defines color `base` #120917), NOT font-size — it silently overrides text color to near-black (invisible on dark). For body size use `text-[1rem]`/`text-lg`, never `text-base`
- `public/photos/*.webp` AND `public/photos/full/*.webp` are GENERATED — do not hand-edit or drop a new file in either, `npm run photos:normalize` overwrites them. Put the new photo in `photos-src/`, add its `FRAMES` row (eyeY + head width, measured in that image's own pixels) in `scripts/normalize-portraits.mjs`, then re-run. Two outputs, on purpose: `photos/` is normalised to 1100×1100, eyes at 36%, head 242px wide (roster + Shows — they sit side by side, so heads must match), `photos/full/` is the untouched original (ArtistPage — profile shows the full figure). `object-position: center` is correct in both
- `public/favicon-*.png` + `public/apple-touch-icon.png` are GENERATED from `public/logo-transparent.png` by `npm run icons:build` — don't hand-edit. Logo change = replace `logo-transparent.png` (also the TopNav logo) and re-run. Tile is transparent + full-bleed (`BG = {r:0,g:0,b:0,alpha:0}`, `INSET = 1`) as of 2026-08-31 (owner's call, `0f2d930`). This has flip-flopped 5× — the recurring reason it gets reverted to a solid `#120917` tile is the cyan `st8` half measuring ~1.43:1 (under the 3:1 floor) on Google/Bing's light results chip and light tab bars. Real fix is logo contrast, not the tile. Set `BG` to `'#120917'` + `INSET = 0.82` to go back to solid
- Contacts (migration 010, built 2026-10-07, see vault `plans/manage-contacts-crm`): migration 010 APPLIED to the live DB 2026-10-07 (via Composio account `supabase_pale-impack`; claude.ai Supabase connector can't see this project), seed COMMITTED 2026-10-07 (54 contacts, 70 inquiries linked); cutover 011 not run. `supabase/scripts/010_seed_contacts.sql` and `011_cutover_convert_sheet_rows.sql` end in `rollback;` on purpose: dry run, read the report, then change to `commit;`. Switch the sheet importer OFF in Apps Script before running 011. Re-prove the SQL with `supabase/proofs/` (needs `npm i --no-save @electric-sql/pglite`).
- Clicking through /manage without Google sign-in: `tmp/preview/` (git-ignored) swaps Supabase for an in-memory fake; `./node_modules/.bin/vite --config tmp/preview/vite.preview.config.ts`, open `/tmp/preview/index.html?as=kasuni|owner|nir`. The fake does not enforce RLS beyond reminders.
- Always update `Projects/FLOST8/STATUS.md` after any work

## Don't

- Don't push to GitHub without explicit user OK (origin: anudapasandul5-lang/flost8-website)
- Don't freehand UI — route through `design-taste-frontend` skill
