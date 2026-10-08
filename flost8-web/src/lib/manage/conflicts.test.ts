import { describe, it, expect } from 'vitest'
import { conflictIds, conflictsFor, describeBooked } from './conflicts'
import { makeInquiry } from './testFixtures'

describe('conflictsFor', () => {
  const booked = [{ id: 'x', event_name: 'Rooftop Launch', venue: null, artists: ['dr-green', 'sonal'] }]
  it('reports each requested artist that is already booked that day', () => {
    const hits = conflictsFor(['dr-green', 'maalin', 'sonal'], booked)
    expect(hits.map((h) => h.slug)).toEqual(['dr-green', 'sonal'])
    expect(describeBooked(hits[0].row)).toBe('Rooftop Launch')
  })
  it('is empty when nobody clashes', () => {
    expect(conflictsFor(['maalin'], booked)).toEqual([])
  })
  it('falls back to venue, then a generic phrase', () => {
    expect(describeBooked({ id: 'v', event_name: ' ', venue: 'The Factory', artists: [] })).toBe('The Factory')
    expect(describeBooked({ id: 'v', event_name: null, venue: null, artists: [] })).toBe('another booking')
  })
})

describe('conflictIds', () => {
  const day = '2026-11-14'
  it('flags confirmed inquiries that share an artist and a date', () => {
    const list = [
      makeInquiry({ id: 'a', status: 'booking_confirmed', event_date: day, artists: ['dr-green'] }),
      makeInquiry({ id: 'b', status: 'booking_confirmed', event_date: day, artists: ['sonal', 'dr-green'] }),
      makeInquiry({ id: 'c', status: 'booking_confirmed', event_date: day, artists: ['imthxd'] }),
      makeInquiry({ id: 'd', status: 'quoted', event_date: day, artists: ['dr-green'] }),
      makeInquiry({ id: 'e', status: 'booking_confirmed', event_date: '2026-11-15', artists: ['dr-green'] }),
    ]
    expect([...conflictIds(list)].sort()).toEqual(['a', 'b'])
  })
  it('does not flag one inquiry against itself', () => {
    const one = makeInquiry({ status: 'booking_confirmed', artists: ['dr-green', 'dr-green'] })
    expect(conflictIds([one]).size).toBe(0)
  })
})
