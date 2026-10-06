// Client-side contract for the Shows admin dashboard. No secrets live here — the
// admin password is supplied by the user at runtime and forwarded per request;
// the server-only ADMIN_SECRET is injected by functions/api/admin.ts, never here.

export const ADMIN_API_URL = '/api/admin'

export interface AdminShow {
  id?: string
  date: string // YYYY-MM-DD
  time: string
  venue: string
  city: string
  artist: string // roster slug (primary — first in a B2B/B3B lineup)
  artist_display: string // roster display name. B2B/B3B sets join names with " B2B " (see composeArtistDisplay)
  ticket_link: string // external ticket-sale URL. Optional — '' means no link yet.
}

/** Build the stored display name for a show, joining 2+ artists as a B2B/B3B set. */
export function composeArtistDisplay(names: Array<string | undefined>): string {
  return names.filter((name): name is string => Boolean(name)).join(' B2B ')
}

/** Split a stored "NAME1 B2B NAME2 B2B NAME3" display string back into its artist names. */
export function splitB2B(artistDisplay: string): string[] {
  return (artistDisplay ?? '')
    .split(/\s+B2B\s+/i)
    .map((name) => name.trim())
    .filter(Boolean)
}

export const EMPTY_SHOW: AdminShow = {
  date: '',
  time: '',
  venue: '',
  city: '',
  artist: '',
  artist_display: '',
  ticket_link: '',
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Required-field + date-format validation. Past dates are allowed (the public
 * site hides them via filterFutureShows); admins may still see/edit them. */
export function validateShow(show: AdminShow): Record<string, string> {
  const errors: Record<string, string> = {}
  const date = (show.date ?? '').trim()
  if (!date) errors.date = 'This field is required'
  else if (!DATE_RE.test(date)) errors.date = 'Enter a valid date'
  if (!(show.venue ?? '').trim()) errors.venue = 'This field is required'
  if (!(show.city ?? '').trim()) errors.city = 'This field is required'
  if (!(show.artist_display ?? '').trim()) errors.artist = 'Select an artist'
  const ticketLink = (show.ticket_link ?? '').trim()
  if (ticketLink && !/^https?:\/\//i.test(ticketLink)) {
    errors.ticket_link = 'Enter a valid link (starting with http:// or https://)'
  }
  return errors
}

/** Format a YYYY-MM-DD date for display, e.g. "Jul 30, 2026". Falls back to the
 * raw value if it isn't a plain date. */
export function prettyDate(date: string): string {
  const m = (date ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return date ?? ''
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

/** Convert a 24h "HH:MM" (from <input type="time">) to a display "10:00 PM". */
export function to12h(hhmm: string): string {
  const m = (hhmm ?? '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return ''
  let h = Number(m[1])
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m[2]} ${ap}`
}

/** Convert a stored time ("10:00 PM" or already-24h "22:00") back to "HH:MM" for
 * the native time input. Returns '' if unparseable. */
export function to24h(display: string): string {
  const s = (display ?? '').trim()
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/)
  if (ampm) {
    let h = Number(ampm[1]) % 12
    if (ampm[3].toLowerCase() === 'pm') h += 12
    return `${String(h).padStart(2, '0')}:${ampm[2]}`
  }
  const h24 = s.match(/^(\d{1,2}):(\d{2})$/)
  if (h24) return `${h24[1].padStart(2, '0')}:${h24[2]}`
  return ''
}

/** Sort ascending by date (soonest first); undated rows sink to the bottom. */
export function sortShows(shows: AdminShow[]): AdminShow[] {
  return [...shows].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
}

/** Thrown on a 401 so the UI can clear the stored password and return to login. */
export class AdminAuthError extends Error {}

interface AdminResponse {
  ok?: boolean
  shows?: AdminShow[]
  show?: AdminShow
  deleted?: boolean
  errors?: Array<{ message?: string }>
}

async function adminRequest(password: string, payload: Record<string, unknown>): Promise<AdminResponse> {
  const res = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ ...payload, password }),
  })
  if (res.status === 401) throw new AdminAuthError('Unauthorized')
  const data = (await res.json().catch(() => null)) as AdminResponse | null
  if (!res.ok || !data || data.ok !== true) {
    throw new Error(data?.errors?.[0]?.message ?? 'Request failed')
  }
  return data
}

/** Verify the password by attempting the cheapest authenticated call. */
export async function listShows(password: string): Promise<AdminShow[]> {
  const data = await adminRequest(password, { action: 'listShows' })
  return data.shows ?? []
}

export async function addShow(password: string, show: AdminShow): Promise<AdminShow> {
  const data = await adminRequest(password, { action: 'addShow', show })
  return data.show as AdminShow
}

export async function updateShow(password: string, id: string, show: AdminShow): Promise<AdminShow> {
  const data = await adminRequest(password, { action: 'updateShow', id, show })
  return data.show as AdminShow
}

export async function deleteShow(password: string, id: string): Promise<void> {
  await adminRequest(password, { action: 'deleteShow', id })
}
