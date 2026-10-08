// Website booking -> Supabase "Bookings Backend" (T1 dual-write). The Apps Script/Sheet path stays
// the source of truth for alerts; this copy must never fail or slow a visitor's submission.
// Underscore prefix = not a route.
//
// The payload comes straight from an anonymous visitor (Turnstile only proves "a browser"), so every
// value is length-capped and `raw` keeps only the keys the real form sends.

export interface IntakeEnv {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

/** Largest POST body the proxy accepts (the real form is ~1 KB). */
export const MAX_BODY_BYTES = 20_000

/** The six roster slugs (supabase `artists.slug`); anything else is dropped from the lineup. */
export const ARTIST_SLUGS = ['sonal', 'dr-green', 'maalin', 'imthxd', 'anush', 'the-professor'] as const

/** Keys the booking form really sends; everything else is dropped before it reaches `raw`. */
const RAW_KEYS = [
  'type', 'set_type', 'event_name', 'event_date', 'venue', 'city', 'event_type', 'set_duration_h',
  'organizer_name', 'direct_number', 'organizer_email', 'other_artists', 'artist', 'lineup_slugs', 'set_lineup',
] as const

const SHORT = 500
const LONG = 2000

const text = (v: unknown, max = SHORT): string | null => {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : ''
  return s || null
}

/** Maps the /bookings payload to an `inquiries` row plus the ordered, validated lineup slugs. */
export function mapBookingToInquiry(payload: Record<string, unknown>) {
  const date = text(payload.event_date, 10)
  const hours = Number(text(payload.set_duration_h, 10))
  // `lineup_slugs` is "sonal,maalin,anush"; fall back to the single `artist` slug for older clients.
  const known = new Set<string>(ARTIST_SLUGS)
  const slugs = [
    ...new Set(
      (text(payload.lineup_slugs, SHORT) ?? text(payload.artist, SHORT) ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(s => known.has(s)),
    ),
  ].slice(0, 3)

  const raw: Record<string, string> = {}
  for (const key of RAW_KEYS) {
    const value = text(payload[key], key === 'other_artists' ? LONG : SHORT)
    if (value) raw[key] = value
  }

  return {
    slugs,
    row: {
      source: 'website',
      set_type: text(payload.set_type, 20),
      event_name: text(payload.event_name),
      event_date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
      venue: text(payload.venue),
      city: text(payload.city),
      event_type: text(payload.event_type, 50),
      set_duration_h: Number.isFinite(hours) && hours > 0 && hours < 48 ? hours : null,
      organizer_name: text(payload.organizer_name),
      organizer_phone: text(payload.direct_number, 40),
      organizer_email: text(payload.organizer_email, 254),
      other_artists: text(payload.other_artists, LONG),
      raw,
    },
  }
}

/**
 * Inserts the inquiry then its lineup. Throws on failure; the caller logs and moves on.
 * Error messages carry status codes and the inquiry id only, never the key, the payload or Supabase's
 * response body (that can echo the row).
 */
export async function saveInquiry(env: IntakeEnv, payload: Record<string, unknown>): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return
  const { row, slugs } = mapBookingToInquiry(payload)
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'content-type': 'application/json',
  }
  const rest = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1`

  const res = await fetch(`${rest}/inquiries?select=id`, {
    method: 'POST',
    headers: { ...headers, prefer: 'return=representation' },
    body: JSON.stringify({ ...row, submission_id: crypto.randomUUID() }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`inquiries insert ${res.status}`)
  const [created] = (await res.json()) as Array<{ id: string }>

  // No valid slug: the inquiry stays (unowned) so the managers still see it.
  if (slugs.length) {
    const lineup = await fetch(`${rest}/inquiry_artists`, {
      method: 'POST',
      headers,
      body: JSON.stringify(slugs.map((artist_slug, i) => ({ inquiry_id: created.id, position: i + 1, artist_slug }))),
      signal: AbortSignal.timeout(8000),
    })
    if (!lineup.ok) throw new Error(`inquiry_artists insert ${lineup.status} (inquiry ${created.id})`)
  }

  // Link the enquiry to a saved contact (same phone or email) or save a new one. After the lineup, so the owner is set.
  // Never fatal: the booking is already stored, and before migration 010 this function does not exist yet.
  try {
    await fetch(`${rest}/rpc/link_intake_contact`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_inquiry: created.id }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // ignored on purpose, see above
  }
}
