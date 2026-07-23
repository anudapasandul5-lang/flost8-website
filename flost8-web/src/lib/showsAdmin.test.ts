import { describe, it, expect } from 'vitest'
import { validateShow, EMPTY_SHOW, to12h, to24h, prettyDate, type AdminShow } from './showsAdmin'

describe('validateShow', () => {
  it('flags all required fields when empty', () => {
    const errors = validateShow(EMPTY_SHOW)
    expect(errors.date).toBeTruthy()
    expect(errors.venue).toBeTruthy()
    expect(errors.city).toBeTruthy()
    expect(errors.artist).toBeTruthy()
  })

  it('rejects a malformed date', () => {
    const show: AdminShow = {
      ...EMPTY_SHOW,
      date: 'Aug 8 2026',
      venue: 'The Factory',
      city: 'Colombo',
      artist: 'dr-green',
      artist_display: 'DR. GREEN',
    }
    expect(validateShow(show).date).toBe('Enter a valid date')
  })

  it('passes a fully valid show', () => {
    const show: AdminShow = {
      ...EMPTY_SHOW,
      date: '2026-08-08',
      time: '10:00 PM',
      venue: 'The Factory',
      city: 'Colombo',
      artist: 'dr-green',
      artist_display: 'DR. GREEN',
    }
    expect(Object.keys(validateShow(show))).toHaveLength(0)
  })
})

describe('time + date formatting', () => {
  it('round-trips 24h <-> 12h', () => {
    expect(to12h('22:00')).toBe('10:00 PM')
    expect(to12h('00:30')).toBe('12:30 AM')
    expect(to24h('10:00 PM')).toBe('22:00')
    expect(to24h('22:00')).toBe('22:00') // already 24h
    expect(to24h('')).toBe('')
  })

  it('prettifies a plain date and passes junk through', () => {
    expect(prettyDate('2026-08-08')).toBe('Aug 8, 2026')
    expect(prettyDate('2026-07-30T20:00:00.000Z')).toBe('Jul 30, 2026')
  })
})
