# FLOST8 form backend (Google Apps Script)

All four website forms — **booking, join, partner, collab** — POST to one endpoint
(`/api/script`). A Cloudflare Pages Function (`functions/api/script.ts`) forwards
that to this Apps Script, which logs the submission to a Google Sheet and emails
the right inbox.

| Form | `type` sent | Emails |
|------|-------------|--------|
| Bookings | `booking` | bookings@flost8.lk |
| Join the roster | `join` | admin@flost8.lk |
| Partner (brands/venues) | `partner` | admin@flost8.lk |
| Collaborate | `collab` | admin@flost8.lk |

Change a destination by editing the `ROUTE` map in `Code.gs` only — no website change needed.

## One-time setup (do this on the Google account that owns the inboxes)

1. Create a Google Sheet (this becomes the submissions log + SSOT).
2. In the Sheet: **Extensions → Apps Script**.
3. Delete the placeholder code, paste the full contents of `Code.gs`, save.
4. **Deploy → New deployment → type: Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**  ← required so the website can reach it
5. Authorize when prompted (it needs Sheet + Gmail/MailApp permission).
6. Copy the **Web app URL** — it ends in `/exec`. This is `APPS_SCRIPT_URL`.

> Re-deploying: use **Manage deployments → edit (pencil) → Version: New version**
> so the `/exec` URL stays the same. A brand-new deployment gives a new URL and
> you'd have to update the env var again.

## Wire the URL into the website (3 places)

- **Cloudflare Pages** → project → Settings → Environment variables → add
  `APPS_SCRIPT_URL = <the /exec url>` (Production + Preview). Redeploy.
- **Local dev** → create `flost8-web/.env` with `APPS_SCRIPT_URL=<the /exec url>`
  (vite proxies `/api/script` to it).
- **`wrangler pages dev`** (optional) → `flost8-web/.dev.vars` with the same line.

Until `APPS_SCRIPT_URL` is set, the Function returns `503 Backend not configured`
and every form shows the "something went wrong" message.

## Test

After deploying + setting the local `.env`:

1. `npm run dev`, open each page, submit a test entry:
   - `/bookings`, `/join`, `/partner`, `/collaborate`
2. Confirm: success screen on the page, a new row in the matching Sheet tab,
   and an email landing in the right inbox (booking → bookings@, the rest → admin@).
3. Reply-to on each email is the submitter's address, so you can reply directly.

## Notes / not done yet

- **Turnstile (spam) check** is stubbed off in `functions/api/script.ts`. Enable it
  by setting `TURNSTILE_SECRET` and uncommenting the block there once you have keys.
- **Upcoming shows**: `doGet` reads an optional `Shows` tab (columns: `date, time,
  venue, city, artist, artist_display`). Leave it empty to keep showing nothing;
  fill it to drive the site's Upcoming Shows list.
- **Dedup** (same submission twice) is not implemented — add if duplicates become a problem.
