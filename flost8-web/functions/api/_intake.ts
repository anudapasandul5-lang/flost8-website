// Website booking -> Supabase "Bookings Backend" (T1 dual-write). The Apps Script/Sheet path stays
// the source of truth for alerts; this copy must never fail or slow a visitor's submission.
// Underscore prefix = not a route.

export interface IntakeEnv {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

const text = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s || null
}

/** Maps the /bookings payload to an `inquiries` row plus the ordered lineup slugs. */
export function mapBookingToInquiry(payload: Record<string, unknown>) {
  const date = text(payload.event_date)
  const hours = Number(text(payload.set_duration_h))
  // `lineup_slugs` is "sonal,maalin,anush"; fall back to the single `artist` slug for older clients.
  const slugs = (text(payload.lineup_slugs) ?? text(payload.artist) ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { token, ...raw } = payload

  return {
    slugs,
    row: {
      source: 'website',
      set_type: text(payload.set_type),
      event_name: text(payload.event_name),
      event_date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
      venue: text(payload.venue),
      city: text(payload.city),
      event_type: text(payload.event_type),
      set_duration_h: Number.isFinite(hours) && hours > 0 ? hours : null,
      organizer_name: text(payload.organizer_name),
      organizer_phone: text(payload.direct_number),
      organizer_email: text(payload.organizer_email),
      other_artists: text(payload.other_artists),
      raw,
    },
  }
}

/** Inserts the inquiry then its lineup. Throws on failure; the caller logs and moves on. */
export async function saveInquiry(env: IntakeEnv, payload: Record<string, unknown>): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return
  const { row, slugs } = mapBookingToInquiry(payload)
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'content-type': 'application/json',
  }
  const rest = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1`

  const res = await fetch(`${rest}/inquiries`, {
    method: 'POST',
    headers: { ...headers, prefer: 'return=representation' },
    body: JSON.stringify({ ...row, submission_id: crypto.randomUUID() }),
  })
  if (!res.ok) throw new Error(`inquiries insert ${res.status}: ${await res.text()}`)
  const [created] = (await res.json()) as Array<{ id: string }>

  if (!slugs.length) return
  const lineup = await fetch(`${rest}/inquiry_artists`, {
    method: 'POST',
    headers,
    body: JSON.stringify(slugs.map((artist_slug, i) => ({ inquiry_id: created.id, position: i + 1, artist_slug }))),
  })
  if (!lineup.ok) throw new Error(`inquiry_artists insert ${lineup.status} (inquiry ${created.id}): ${await lineup.text()}`)
}
