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

## Shows admin dashboard (`/admin`)

The site has a password-protected `/admin` page to add / edit / delete the
Upcoming Shows without touching the spreadsheet. It writes to the same `Shows`
tab that `doGet` reads, so the homepage updates automatically.

Data flow: `/admin` → `functions/api/admin.ts` (checks the password, injects a
server-only secret) → this Apps Script `doPost` (verifies the secret, does the
CRUD). The `/exec` URL is public, so the secret check here is what actually
protects the sheet — the password check at the Function is a first gate.

**Setup (one-time):**

1. **Cloudflare Pages** → Settings → Environment variables (Production + Preview):
   - `ADMIN_PASSWORD` = the password you'll type at `/admin` (share with the team).
   - `ADMIN_SECRET` = a long random string (e.g. from a password generator).
   Redeploy after adding.
2. **Apps Script** → Project Settings (gear) → Script properties → Add property:
   - `ADMIN_SECRET` = **the exact same** random string as above.
3. Re-deploy this script (**Manage deployments → edit → New version**) so the new
   `doPost` code is live. The `/exec` URL stays the same.
4. **Rate-limit (recommended):** Cloudflare → Security → WAF → add a rate-limit
   rule on `/api/admin` (e.g. 10 requests / minute / IP) to blunt password guessing.

The `Shows` tab and its `id` column are created automatically on the first add —
no manual sheet setup. Columns: `id, date, time, venue, city, artist, artist_display`.
The date should be `YYYY-MM-DD`; `artist` is the roster slug, `artist_display` the
display name (both set from the dropdown).

**Testing the admin page locally:** it only works under `wrangler pages dev`
(with `ADMIN_PASSWORD` + `ADMIN_SECRET` + `APPS_SCRIPT_URL` in `.dev.vars`, and the
`ADMIN_SECRET` script property set). Plain `npm run dev` bypasses Pages Functions,
so `/api/admin` — and thus the whole dashboard — will not authenticate.

## Notes / not done yet

- **Turnstile (spam) check** is stubbed off in `functions/api/script.ts`. Enable it
  by setting `TURNSTILE_SECRET` and uncommenting the block there once you have keys.
- **Upcoming shows (read):** `doGet` reads the `Shows` tab (see above), sorts by date
  ascending, and returns `{ events: [...] }`. Empty/missing tab → empty list.
- **Dedup** (same submission or show twice) is not implemented — add if duplicates
  become a problem.
