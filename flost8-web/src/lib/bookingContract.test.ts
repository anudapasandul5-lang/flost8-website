import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import {
  validateBookingForm,
  normalizeUpcomingShows,
  EMPTY_BOOKING_FORM,
  type BookingFormData,
} from './bookingContract'

describe('validateBookingForm', () => {
  it('flags required fields when empty', () => {
    const errors = validateBookingForm(EMPTY_BOOKING_FORM)
    expect(errors.artist).toBeTruthy()
    expect(errors.event_name).toBeTruthy()
    expect(errors.venue).toBeTruthy()
    expect(errors.organizer_email).toBeTruthy()
    expect(errors.event_date).toBeTruthy()
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
