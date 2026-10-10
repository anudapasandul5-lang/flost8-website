# FLOST8 Website

Client website for FLOST8, with a booking calendar, per-artist booking, an inquiry form and an admin area.

**Live:** https://flost8.lk
**Stack:** React 19, Vite, Supabase, Tailwind CSS 3, hosted on Cloudflare Pages. Google Apps Script handles the Google Calendar side.

## Layout

| Folder | What it is |
|---|---|
| `flost8-web/` | The real site (React app). Work here. |
| `apps-script/` | Google Apps Script code. The deployed script project can drift from this copy, so check the live one before editing. |
| root `*.html` | The old single-file site, kept frozen |

## Run locally

```bash
cd flost8-web
npm install
npm run dev     # Vite dev server
npm test        # Vitest
```

## Deploy

```bash
cd flost8-web
npm run deploy:dev    # Cloudflare Pages preview
npm run deploy:prod   # production (flost8.lk)
```

Analytics needs the PostHog key in `flost8-web/.env.production.local`, which is gitignored. A build from a checkout without that file ships with analytics silently off.

## Project notes

- `CONTEXT.md`: domain terms and decisions
- `docs/`: plans and specs
