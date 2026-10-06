import { describe, it, expect } from 'vitest'
import { EMPTY_EVENT, ownerFor, toInquiryRow, toMoneyRow, validateNewEvent, type NewEventInput } from './newEvent'
import { KASUNI, OWNER } from './testFixtures'

const ok: NewEventInput = {
  ...EMPTY_EVENT,
  artists: ['dr-green'],
  date: '2026-10-17',
  name: 'Skyline Rooftop Session',
  venue: 'Cloud Nine',
  city: 'Colombo',
  fee: '120,000',
  organizer: 'Dinesh',
  phone: '077 555 0192',
}

describe('validateNewEvent', () => {
  it('accepts a complete entry', () => {
    expect(validateNewEvent(ok)).toBeNull()
  })
  it('needs an artist, a real date, and a name or a venue', () => {
    expect(validateNewEvent({ ...ok, artists: [] })).toMatch(/artist/i)
    expect(validateNewEvent({ ...ok, date: '' })).toMatch(/date/i)
    expect(validateNewEvent({ ...ok, date: '17/10/2026' })).toMatch(/date/i)
    expect(validateNewEvent({ ...ok, name: ' ', venue: '' })).toMatch(/name or a venue/i)
    expect(validateNewEvent({ ...ok, name: '', venue: 'Cloud Nine' })).toBeNull()
  })
  it('rejects a fee that is not a number, allows it blank', () => {
    expect(validateNewEvent({ ...ok, fee: 'lots' })).toMatch(/fee/i)
    expect(validateNewEvent({ ...ok, fee: '' })).toBeNull()
  })
})

describe('toInquiryRow', () => {
  it('maps to the table columns: trimmed, blanks as null, marked as added in the app', () => {
    expect(toInquiryRow({ ...ok, name: '  Skyline  ', city: '', setTime: ' 10 pm ' }, 'm-kasuni')).toEqual({
      source: 'manual',
      status: 'booking_confirmed',
      owner_id: 'm-kasuni',
      event_name: 'Skyline',
      event_date: '2026-10-17',
      venue: 'Cloud Nine',
      city: null,
      set_time: '10 pm',
      organizer_name: 'Dinesh',
      organizer_phone: '077 555 0192',
    })
  })
  it('keeps the chosen status', () => {
    expect(toInquiryRow({ ...ok, status: 'quoted' }, null).status).toBe('quoted')
  })
})

describe('toMoneyRow', () => {
  it('is null without a fee', () => {
    expect(toMoneyRow({ ...ok, fee: '' })).toBeNull()
  })
  it('treats the whole fee as still owed, since nothing has been paid yet', () => {
    expect(toMoneyRow({ ...ok, currency: 'USD', fee: '1,200' })).toEqual({
      currency: 'USD', fee: 1200, advance: null, balance: 1200, balance_note: null, total: null, booking_fee: null,
    })
  })
})

describe('ownerFor', () => {
  const artists = [
    { slug: 'dr-green', name: 'Dr. Green', manager_id: 'm-kasuni' },
    { slug: 'anush', name: 'Anush', manager_id: 'm-nirb' },
  ]
  it('a manager owns what they add', () => {
    expect(ownerFor(['dr-green'], KASUNI, artists)).toBe(KASUNI.id)
  })
  it("the owner role gives it to the first artist's manager", () => {
    expect(ownerFor(['anush', 'dr-green'], OWNER, artists)).toBe('m-nirb')
  })
  it('the owner role leaves it unassigned when the artist has no manager', () => {
    expect(ownerFor(['ghost'], OWNER, artists)).toBeNull()
  })
})
