import { BOOKING_ARTIST_OPTIONS } from './artistRoster'

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
}

export interface BookingFormData {
  artist: string
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

export interface BookingPayload extends BookingFormData {
  token: string
}

interface ApiEvent {
  date?: unknown
  time?: unknown
  venue?: unknown
  city?: unknown
  artist?: unknown
  artist_display?: unknown
}

export const EMPTY_BOOKING_FORM: BookingFormData = {
  artist: 'any',
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
    id: 'artist',
    label: 'Artist Requested',
    type: 'select',
    required: true,
    options: BOOKING_ARTIST_OPTIONS,
  },
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
  { artist: 'DR. GREEN', date: 'Jun 14 2026', venue: 'The Factory', city: 'Colombo' },
  { artist: 'SONAL', date: 'Jun 21 2026', venue: 'Arugam Bay Hotel', city: 'Arugam Bay' },
  { artist: 'IMTHXD', date: 'Jun 28 2026', venue: 'Kama', city: 'Colombo' },
  { artist: 'MAALIN', date: 'Jul 5 2026', venue: 'Hilton Rooftop', city: 'Colombo' },
  { artist: 'THE PROFESSOR', date: 'Jul 19 2026', venue: 'Salt', city: 'Mirissa' },
]

export function normalizeUpcomingShows(data: unknown, limit?: number): UpcomingShow[] {
  const rows = getEventRows(data)
  const shows = rows.map(normalizeEvent).filter((show): show is UpcomingShow => Boolean(show))
  return typeof limit === 'number' ? shows.slice(0, limit) : shows
}

export function validateBookingForm(formData: BookingFormData): Record<string, string> {
  return BOOKING_FIELDS.reduce<Record<string, string>>((errors, field) => {
    if (field.required && !String(formData[field.id] ?? '').trim()) {
      errors[field.id] = 'This field is required'
    }
    return errors
  }, {})
}

export function buildBookingPayload(formData: BookingFormData, token: string): BookingPayload {
  return {
    ...formData,
    artist: formData.artist || 'any',
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
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return date

  const [, year, month, day] = match
  const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const formatted = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate)

  return time ? `${formatted} - ${time}` : formatted
}
