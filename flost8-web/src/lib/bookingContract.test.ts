import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import {
  validateBookingForm,
  buildBookingPayload,
  normalizeUpcomingShows,
  EMPTY_BOOKING_FORM,
  type BookingFormData,
} from './bookingContract'

describe('buildBookingPayload', () => {
  it('keeps `artist` a single slug and names the full lineup for a B3B set', () => {
    const payload = buildBookingPayload(
      { ...EMPTY_BOOKING_FORM, set_type: 'B3B', dj_1: 'sonal', dj_2: 'maalin', dj_3: 'anush' },
      'tok',
    )
    expect(payload.artist).toBe('sonal')
    expect(payload.set_type).toBe('B3B')
    expect(payload.set_lineup).toBe('SONAL B2B MAALIN B2B ANUSH')
    expect(payload.lineup_slugs).toBe('sonal,maalin,anush')
    expect(payload).not.toHaveProperty('dj_1')
  })

  it('drops extra DJ picks that the set type does not use', () => {
    const payload = buildBookingPayload(
      { ...EMPTY_BOOKING_FORM, set_type: 'Solo', dj_1: 'sonal', dj_2: 'maalin' },
      'tok',
    )
    expect(payload.set_lineup).toBe('SONAL')
  })
})

describe('validateBookingForm', () => {
  it('flags required fields when empty', () => {
    const errors = validateBookingForm(EMPTY_BOOKING_FORM)
    expect(errors.dj_1).toBeTruthy()
    expect(errors.event_name).toBeTruthy()
    expect(errors.venue).toBeTruthy()
    expect(errors.organizer_email).toBeTruthy()
    expect(errors.event_date).toBeTruthy()
  })

  it('does not require dj_2 / dj_3 for a Solo set', () => {
    const errors = validateBookingForm({ ...EMPTY_BOOKING_FORM, set_type: 'Solo' })
    expect(errors.dj_2).toBeUndefined()
    expect(errors.dj_3).toBeUndefined()
  })

  it('requires the second DJ for B2B and the third for B3B', () => {
    const b2b = validateBookingForm({ ...EMPTY_BOOKING_FORM, set_type: 'B2B', dj_1: 'sonal' })
    expect(b2b.dj_2).toBeTruthy()
    expect(b2b.dj_3).toBeUndefined()

    const b3b = validateBookingForm({ ...EMPTY_BOOKING_FORM, set_type: 'B3B', dj_1: 'sonal', dj_2: 'maalin' })
    expect(b3b.dj_3).toBeTruthy()
  })

  it('rejects the same DJ picked twice in a set', () => {
    const errors = validateBookingForm({
      ...EMPTY_BOOKING_FORM,
      set_type: 'B2B',
      dj_1: 'sonal',
      dj_2: 'sonal',
    })
    expect(errors.dj_2).toBe('Each DJ must be different')
  })

  it('rejects a malformed email and a past date', () => {
    const form: BookingFormData = {
      ...EMPTY_BOOKING_FORM,
      venue: 'The Factory',
      city: 'Colombo',
      event_type: 'NIGHT',
      set_duration_h: '3',
      organizer_name: 'Test',
      direct_number: '+94770000000',
      organizer_email: 'not-an-email',
      event_date: '2000-01-01',
    }
    const errors = validateBookingForm(form)
    expect(errors.organizer_email).toBe('Enter a valid email')
    expect(errors.event_date).toBe('Pick a future date')
  })
})

// normalizeUpcomingShows now drops finished shows, so every fixture below is relative to a
// pinned clock. Without this the date-formatting specs would start failing the day their
// hard-coded dates fall into the past.
const NOW = new Date('2026-06-01T09:00:00.000Z')

describe('normalizeUpcomingShows (§4 ISO date parsing)', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterAll(() => vi.useRealTimers())

  it('formats a plain YYYY-MM-DD date', () => {
    const [show] = normalizeUpcomingShows([
      { artist: 'DR. GREEN', venue: 'The Factory', city: 'Colombo', date: '2026-06-14' },
    ])
    expect(show.date).toBe('Jun 14, 2026')
  })

  it('formats a full ISO datetime (Date-typed Sheet cell)', () => {
    const [show] = normalizeUpcomingShows([
      { artist: 'SONAL', venue: 'Salt', city: 'Mirissa', date: '2026-06-14T00:00:00.000Z' },
    ])
    // must NOT render the raw ISO string
    expect(show.date).toBe('Jun 14, 2026')
  })
})

describe('normalizeUpcomingShows (finished shows)', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterAll(() => vi.useRealTimers())

  const row = (artist: string, date: string) => ({
    artist,
    venue: 'The Factory',
    city: 'Kandy',
    date,
  })

  it('drops a show that already happened', () => {
    const shows = normalizeUpcomingShows([row('DR. GREEN', '2026-05-25')])
    expect(shows).toEqual([])
  })

  it("keeps a show dated today (it hasn't happened until the day is over)", () => {
    const shows = normalizeUpcomingShows([row('SONAL', '2026-06-01')])
    expect(shows).toHaveLength(1)
  })

  it('keeps a show with an unreadable date (fail open, never silently hide a real gig)', () => {
    const shows = normalizeUpcomingShows([row('IMTHXD', 'next Friday')])
    expect(shows).toHaveLength(1)
    expect(shows[0].date).toBe('next Friday')
  })

  it('applies the limit AFTER filtering, so n=2 returns two future shows', () => {
    const shows = normalizeUpcomingShows(
      [
        row('PAST 1', '2026-01-01'),
        row('PAST 2', '2026-02-01'),
        row('FUTURE 1', '2026-07-01'),
        row('FUTURE 2', '2026-08-01'),
        row('FUTURE 3', '2026-09-01'),
      ],
      2,
    )
    expect(shows.map((s) => s.artist)).toEqual(['FUTURE 1', 'FUTURE 2'])
  })
})
