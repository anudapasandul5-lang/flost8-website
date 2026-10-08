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
no manual sheet setup. Columns: `id, date, time, venue, city, artist, artist_display,
ticket_link`. The date should be `YYYY-MM-DD`; `artist` is the roster slug,
`artist_display` the display name (both set from the dropdown). `ticket_link` is
optional — when set, the whole Upcoming Shows card on the homepage links straight
to it.

**Testing the admin page locally:** it only works under `wrangler pages dev`
(with `ADMIN_PASSWORD` + `ADMIN_SECRET` + `APPS_SCRIPT_URL` in `.dev.vars`, and the
`ADMIN_SECRET` script property set). Plain `npm run dev` bypasses Pages Functions,
so `/api/admin` — and thus the whole dashboard — will not authenticate.

## WhatsApp alerts (bookings only)

Booking enquiries ping the WhatsApp number of whoever manages the requested
artist, via the official [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
(one shared FLOST8 sender number messages each person's own WhatsApp number —
they don't need a business account themselves, though they can have one, it
doesn't matter to the API). Optional overall — leave the Script Properties
unset and nothing changes (email still goes out as always).

**Current artist → person routing** (`WHATSAPP_ROUTE` in `Code.gs`):

| Artist | Person |
|--------|--------|
| IMTHXD, ANUSH, THE PROFESSOR | Nirbheeth |
| SONAL, DR. GREEN, MAALIN | Kasuni |

**Setup (one-time):**

1. Create a [Meta Developer](https://developers.facebook.com) account + app,
   add the **WhatsApp** product. The dashboard gives you a free test number
   and its **Phone Number ID** — copy that ID.
2. **Business Settings → Users → System Users** → create one, assign it to
   the app with `whatsapp_business_messaging` permission, generate a
   **permanent access token** (not the default 24h token — that one expires
   and alerts would silently stop after a day). Copy the token.
3. In the WhatsApp API Setup dashboard, add Anuda's, Kasuni's, and
   Nirbheeth's numbers to the test number's **recipient list** (each verifies
   via a code Meta texts them) — a test number can only message numbers on
   this list, capped at 5.
4. **WhatsApp Manager → Message Templates** → create `booking_alert`
   (category: Utility, language: English (US)), body text with 6 numbered
   placeholders **in this exact order** — artist, event_date, venue, city,
   organizer_name, direct_number, e.g.:
   > New booking enquiry
   > Artist: {{1}}
   > Date: {{2}}
   > Venue: {{3}}, {{4}}
   > Organizer: {{5}} ({{6}})

   Submit for review. Approval is usually quick, occasionally up to ~24h —
   sends silently fail until it's approved (see troubleshooting below).
5. **Apps Script** → Project Settings (gear) → Script properties → add:
   - `WHATSAPP_CLOUD_PHONE_ID` = the Phone Number ID from step 1
   - `WHATSAPP_CLOUD_TOKEN` = the permanent token from step 2
   - `WHATSAPP_NIRBHEETH_PHONE` = digits + country code only, no `+` or spaces
     (e.g. `94771234567`, not `+94 77 123 4567`)
   - `WHATSAPP_KASUNI_PHONE` = `94786552412`
6. Re-deploy (**Manage deployments → edit → New version**) so `doPost` picks
   it up. The `/exec` URL stays the same.

**Testing:** until Nirbheeth sends his real number, set
`WHATSAPP_NIRBHEETH_PHONE` to your own (`94763431469`, already added to the
recipient list in step 3) so bookings for his 3 artists alert you instead.
Swap in his real number later — no code change needed, just edit the Script
Property and re-deploy.

**Cost:** the setup above is free. Each template send outside an existing 24h
conversation carries a small per-message utility fee (varies by recipient
country) — negligible at booking-enquiry volume, but not literally $0.

**Troubleshooting:** a rejected send (unapproved template, un-whitelisted
recipient, expired/bad token) fails silently by design — the booking still
logs and emails normally, but no WhatsApp arrives and no error surfaces
anywhere in the website or Sheet. If a message doesn't show up, check
**WhatsApp Manager → Overview → message/error logs** in Meta's dashboard for
the actual rejection reason before assuming `Code.gs` is broken.

Adding/moving an artist later = edit the `WHATSAPP_ROUTE` map in `Code.gs`
only, same as the email `ROUTE` map above.

## Notes / not done yet

- **Turnstile (spam) check** is stubbed off in `functions/api/script.ts`. Enable it
  by setting `TURNSTILE_SECRET` and uncommenting the block there once you have keys.
- **Upcoming shows (read):** `doGet` reads the `Shows` tab (see above), sorts by date
  ascending, and returns `{ events: [...] }`. Empty/missing tab → empty list.
- **Dedup** (same submission or show twice) is not implemented — add if duplicates
  become a problem.
