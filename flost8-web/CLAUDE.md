# FLOST8 — Project CLAUDE.md

**Stack:** React + Vite + Cloudflare Pages. Branch `rebuild` (production = `v2`).
**Live preview:** https://dev.flost8.pages.dev
**Vault:** `Projects/FLOST8/STATUS.md`

## Skills allowed (model-enforced — Claude Code has no native allowlist)

Invoke only when relevant:
- `design-taste-frontend` — **mandatory for all UI/design decisions** (user requirement, see vault antipatterns)
- `frontend-design` — component implementation
- `animate` / `impeccable:animate` — motion enhancements
- `gpt-taste` — alternative design lens
- `vercel:nextjs` — N/A here (Cloudflare Pages)
- `agent-browser` — preview QA
- `wiki` / `save` / `think` — vault

Decline others unless user explicit.

## Gotchas

- `wrangler` bare commands mangled by RTK hook → use `npm run` scripts
- `backdrop-filter` ancestor = containing block for `fixed` children → broke mobile menu
- Bookings POST to `/api/script` → handled by `functions/api/script.ts` (Pages Function forwards to Apps Script). Needs Cloudflare Pages env vars `APPS_SCRIPT_URL` + `TURNSTILE_SECRET` set in Production. Turnstile server-side verify is SKIPPED if `TURNSTILE_SECRET` unset → forms unprotected. No rate limiting yet (see vault `flost8-traffic-defense-moc`)
- Hero text split must be word-atomic (`.word` inline-block + `white-space: nowrap`), not glyph-atomic, or browser breaks mid-word
- `text-base` is a COLOR utility here (palette defines color `base` #120917), NOT font-size — it silently overrides text color to near-black (invisible on dark). For body size use `text-[1rem]`/`text-lg`, never `text-base`
- Always update `Projects/FLOST8/STATUS.md` after any work

## Don't

- Don't push to GitHub without explicit user OK (origin: anudapasandul5-lang/flost8-website)
- Don't freehand UI — route through `design-taste-frontend` skill
