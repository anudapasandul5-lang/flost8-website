import { BOOKING_ARTIST_OPTIONS, getPublicArtistBySlug } from './artistRoster'

export interface UpcomingShow {
  artist: string
  date: string
  venue: string
  city: string
}

export interface BookingFieldDef {
  id: keyof BookingFormData
  label: string
  type: 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'textarea'
  required: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  fullWidth?: boolean
  min?: string
  max?: string
  step?: string
  /** Field is only rendered + validated when this returns true. */
  showIf?: (data: Record<string, string>) => boolean
}

/** Which extra DJ slots a set type needs. Solo = just dj_1. */
export function djSlots(setType: string): { dj2: boolean; dj3: boolean } {
  return { dj2: setType === 'B2B' || setType === 'B3B', dj3: setType === 'B3B' }
}

export interface BookingFormData {
  set_type: string
  dj_1: string
  dj_2: string
  dj_3: string
  event_name: string
  event_date: string
  venue: string
  city: string
  event_type: string
  set_duration_h: string
  organizer_name: string
  direct_number: string
  organizer_email: string
  other_artists: string
}

export type BookingPayload = Record<string, string> & { type: 'booking'; token: string }

interface ApiEvent {
  date?: unknown
  time?: unknown
  venue?: unknown
  city?: unknown
  artist?: unknown
  artist_display?: unknown
}

export const EMPTY_BOOKING_FORM: BookingFormData = {
  set_type: 'Solo',
  dj_1: '',
  dj_2: '',
  dj_3: '',
  event_name: '',
  event_date: '',
  venue: '',
  city: '',
  event_type: '',
  set_duration_h: '',
  organizer_name: '',
  direct_number: '',
  organizer_email: '',
  other_artists: '',
}

export const BOOKING_FIELDS: BookingFieldDef[] = [
  {
    id: 'set_type',
    label: 'Set Type',
    type: 'select',
    required: true,
    options: [
      { value: 'Solo', label: 'Solo — 1 DJ' },
      { value: 'B2B', label: 'B2B — 2 DJs back to back' },
      { value: 'B3B', label: 'B3B — 3 DJs back to back' },
    ],
  },
  { id: 'dj_1', label: 'DJ', type: 'select', required: true, options: BOOKING_ARTIST_OPTIONS },
  {
    id: 'dj_2',
    label: 'Second DJ',
    type: 'select',
    required: true,
    options: BOOKING_ARTIST_OPTIONS,
    showIf: data => djSlots(data.set_type).dj2,
  },
  {
    id: 'dj_3',
    label: 'Third DJ',
    type: 'select',
    required: true,
    options: BOOKING_ARTIST_OPTIONS,
    showIf: data => djSlots(data.set_type).dj3,
  },
  { id: 'event_name', label: 'Event Name', type: 'text', required: true, placeholder: 'e.g. New Year\'s Eve Bash' },
  { id: 'event_date', label: 'Event Date', type: 'date', required: true },
  { id: 'venue', label: 'Venue', type: 'text', required: true, placeholder: 'Venue name' },
  { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Colombo' },
  {
    id: 'event_type',
    label: 'Event Time',
    type: 'select',
    required: true,
    options: [
      { value: 'NIGHT', label: 'Night event' },
      { value: 'DAY', label: 'Day event' },
    ],
  },
  {
    id: 'set_duration_h',
    label: 'Set Duration',
    type: 'number',
    required: true,
    placeholder: '3',
    min: '1',
    max: '8',
    step: '0.5',
  },
  {
    id: 'organizer_name',
    label: 'Organizer Name',
    type: 'text',
    required: true,
    placeholder: 'Full name',
  },
  {
    id: 'direct_number',
    label: 'Phone Number',
    type: 'tel',
    required: true,
    placeholder: '+94 77 000 0000',
  },
  {
    id: 'organizer_email',
    label: 'Email Address',
    type: 'email',
    required: true,
    placeholder: 'you@example.com',
  },
  {
    id: 'other_artists',
    label: 'Other Artists',
    type: 'text',
    required: false,
    placeholder: 'Optional lineup notes',
  },
]

export const PLACEHOLDER_SHOWS: UpcomingShow[] = [
  { artist: 'DR. GREEN', date: 'Aug 8 2026', venue: 'The Factory', city: 'Colombo' },
  { artist: 'SONAL', date: 'Aug 22 2026', venue: 'Arugam Bay Hotel', city: 'Arugam Bay' },
  { artist: 'IMTHXD', date: 'Sep 5 2026', venue: 'Kama', city: 'Colombo' },
  { artist: 'MAALIN', date: 'Sep 19 2026', venue: 'Hilton Rooftop', city: 'Colombo' },
  { artist: 'THE PROFESSOR', date: 'Oct 3 2026', venue: 'Salt', city: 'Mirissa' },
  { artist: 'ANUSH', date: 'Oct 17 2026', venue: 'Ministry of Crab', city: 'Colombo' },
]

/** Today as `YYYY-MM-DD` in UTC — same key space the sheet's date cells use. */
function todayKeyUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

/** The `YYYY-MM-DD` prefix of a raw date cell, or '' when it isn't one. */
function dateKey(raw: string): string {
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T ].*)?$/)
  return match ? match[1] : ''
}

export function normalizeUpcomingShows(data: unknown, limit?: number): UpcomingShow[] {
  const today = todayKeyUTC()
  const shows = getEventRows(data)
    // Finished shows must never reach the UI. Compare the RAW date cell, not the formatted
    // label — ISO keys sort as strings, so no Date parsing is needed. Filtering happens
    // BEFORE the limit slice so `n=5` yields five *future* shows, not five rows minus the
    // past ones. Fail open: a date we can't read is kept rather than silently dropped.
    .filter((event) => {
      const key = dateKey(stringValue(event.date))
      return key === '' || key >= today
    })
    .map(normalizeEvent)
    .filter((show): show is UpcomingShow => Boolean(show))
  return typeof limit === 'number' ? shows.slice(0, limit) : shows
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateBookingForm(formData: BookingFormData): Record<string, string> {
  const data = formData as unknown as Record<string, string>
  const errors = BOOKING_FIELDS.reduce<Record<string, string>>((errors, field) => {
    if (field.showIf && !field.showIf(data)) return errors
    const value = String(formData[field.id] ?? '').trim()

    if (field.required && !value) {
      errors[field.id] = 'This field is required'
      return errors
    }

    if (!value) return errors

    if (field.id === 'organizer_email' && !EMAIL_RE.test(value)) {
      errors[field.id] = 'Enter a valid email'
    } else if (field.id === 'direct_number') {
      const digits = value.replace(/[\s+\-()]/g, '')
      if (digits.length < 7 || !/^\d+$/.test(digits)) {
        errors[field.id] = 'Enter a valid phone number'
      }
    } else if (field.id === 'event_date') {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      if (value < todayStr) {
        errors[field.id] = 'Pick a future date'
      }
    }

    return errors
  }, {})

  // Every DJ in the set must be a distinct person.
  const slots = djSlots(formData.set_type)
  const picks = [
    formData.dj_1,
    slots.dj2 ? formData.dj_2 : '',
    slots.dj3 ? formData.dj_3 : '',
  ].map(s => s.trim()).filter(Boolean)
  if (new Set(picks).size !== picks.length) {
    if (slots.dj3 && !errors.dj_3) errors.dj_3 = 'Each DJ must be different'
    else if (slots.dj2 && !errors.dj_2) errors.dj_2 = 'Each DJ must be different'
  }

  return errors
}

export function buildBookingPayload(formData: BookingFormData, token: string): BookingPayload {
  const slots = djSlots(formData.set_type)
  const slugs = [
    formData.dj_1,
    slots.dj2 ? formData.dj_2 : '',
    slots.dj3 ? formData.dj_3 : '',
  ].map(s => s.trim()).filter(Boolean)
  const names = slugs.map(slug => getPublicArtistBySlug(slug)?.name ?? slug)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dj_1, dj_2, dj_3, ...rest } = formData
  return {
    type: 'booking',
    ...rest,
    // `artist` stays a single roster slug — the backend routes the WhatsApp
    // alert by exact slug match, so a B2B/B3B set is attributed to the first DJ.
    artist: slugs[0] ?? '',
    // Every roster slug in order, comma-joined (payload values are strings). The booking
    // database maps a B2B/B3B set to all its artists from this.
    lineup_slugs: slugs.join(','),
    // Full human-readable lineup, e.g. "SONAL B2B MAALIN" (same join the Shows admin uses).
    set_lineup: names.join(' B2B '),
    set_duration_h: String(formData.set_duration_h || '').trim(),
    token,
  }
}

export function errorsFromApi(errors: unknown): Record<string, string> {
  if (!Array.isArray(errors)) return {}

  return errors.reduce<Record<string, string>>((acc, entry) => {
    if (!entry || typeof entry !== 'object') return acc
    const field = 'field' in entry ? String(entry.field) : ''
    const message = 'message' in entry ? String(entry.message) : 'Invalid value'
    if (field) acc[field] = message
    return acc
  }, {})
}

function getEventRows(data: unknown): ApiEvent[] {
  if (Array.isArray(data)) return data as ApiEvent[]
  if (!data || typeof data !== 'object') return []

  const record = data as Record<string, unknown>
  if (Array.isArray(record.events)) return record.events as ApiEvent[]
  if (Array.isArray(record.shows)) return record.shows as ApiEvent[]
  return []
}

function normalizeEvent(event: ApiEvent): UpcomingShow | null {
  const artist = stringValue(event.artist_display ?? event.artist)
  const venue = stringValue(event.venue)
  const city = stringValue(event.city)
  const date = formatShowDate(stringValue(event.date), stringValue(event.time))

  if (!artist || !venue || !date) return null
  return { artist, date, venue, city }
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function formatShowDate(date: string, time: string): string {
  if (!date) return ''
  // §4: accept both plain `YYYY-MM-DD` and full ISO datetimes (a Date-typed Sheet
  // cell serialises as `2026-06-14T00:00:00.000Z`), taking the date portion.
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/)
  if (!match) return date

  const [, year, month, day] = match
  const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const formatted = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate)

  return time ? `${formatted} - ${format12h(time)}` : formatted
}

// Display a 24h "HH:MM" time (as stored by the Sheet) as "10:00 PM". Any other
// shape (already 12h, or free text) passes through unchanged.
function format12h(time: string): string {
  const m = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return time
  let h = Number(m[1])
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m[2]} ${ap}`
}
