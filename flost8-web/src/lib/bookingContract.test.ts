import { describe, it, expect } from 'vitest'
import {
  validateBookingForm,
  normalizeUpcomingShows,
  EMPTY_BOOKING_FORM,
  type BookingFormData,
} from './bookingContract'

describe('validateBookingForm', () => {
  it('flags required fields when empty', () => {
    const errors = validateBookingForm(EMPTY_BOOKING_FORM)
    // artist defaults to 'any', so it passes; the rest are required and blank
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

describe('normalizeUpcomingShows (§4 ISO date parsing)', () => {
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
