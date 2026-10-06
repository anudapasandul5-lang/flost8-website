import { describe, it, expect } from 'vitest'
import { applyFilters, DEFAULT_FILTERS, todayISO, type Filters } from './filters'
import { makeInquiry } from './testFixtures'

const ctx = { mySlugs: new Set(['dr-green', 'sonal']), today: '2026-10-06' }
const f = (over: Partial<Filters> = {}): Filters => ({ ...DEFAULT_FILTERS, ...over })

describe('applyFilters', () => {
  const list = [
    makeInquiry({ id: 'a', event_date: '2026-11-01', artists: ['dr-green'] }),
    makeInquiry({ id: 'b', event_date: '2026-12-01', artists: ['imthxd'], event_name: 'Neon Rooftop' }),
    makeInquiry({ id: 'c', event_date: '2026-09-01', artists: ['sonal', 'imthxd'], status: 'booking_confirmed' }),
    makeInquiry({ id: 'd', event_date: null, artists: ['dr-green'], status: 'spam' }),
    makeInquiry({ id: 'e', event_date: null, artists: ['dr-green'], created_at: '2026-09-20T00:00:00Z' }),
  ]

  it('My artists keeps only lineups that include one of my artists, spam hidden, soonest upcoming first, then past (latest first), undated last', () => {
    expect(applyFilters(list, f(), ctx).map((i) => i.id)).toEqual(['a', 'c', 'e'])
  })

  it('orders closest first: upcoming ascending, then past latest-first, then undated', () => {
    const t = [
      makeInquiry({ id: 'far', event_date: '2027-08-29', artists: ['dr-green'] }),
      makeInquiry({ id: 'old', event_date: '2026-01-10', artists: ['dr-green'] }),
      makeInquiry({ id: 'today', event_date: '2026-10-06', artists: ['dr-green'] }),
      makeInquiry({ id: 'soon', event_date: '2026-10-20', artists: ['dr-green'] }),
      makeInquiry({ id: 'recent', event_date: '2026-09-30', artists: ['dr-green'] }),
      makeInquiry({ id: 'nodate', event_date: null, artists: ['dr-green'] }),
    ]
    expect(applyFilters(t, f(), ctx).map((i) => i.id)).toEqual(['today', 'soon', 'far', 'recent', 'old', 'nodate'])
  })

  it("Everyone's includes other managers' artists", () => {
    expect(applyFilters(list, f({ scope: 'everyone' }), ctx).map((i) => i.id)).toEqual(['a', 'b', 'c', 'e'])
  })

  it('status chips narrow the list and spam only shows when asked for', () => {
    expect(applyFilters(list, f({ scope: 'everyone', statuses: ['booking_confirmed'] }), ctx).map((i) => i.id)).toEqual(['c'])
    expect(applyFilters(list, f({ scope: 'everyone', statuses: ['spam'] }), ctx).map((i) => i.id)).toEqual(['d'])
  })

  it('upcoming and past split on today, and exclude undated rows', () => {
    const all = { scope: 'everyone' as const }
    expect(applyFilters(list, f({ ...all, timeframe: 'upcoming' }), ctx).map((i) => i.id)).toEqual(['a', 'b'])
    expect(applyFilters(list, f({ ...all, timeframe: 'past' }), ctx).map((i) => i.id)).toEqual(['c'])
  })

  it('searches event name, venue and organizer, case-insensitively', () => {
    const l = [
      makeInquiry({ id: 'x', event_name: 'Sunset Sessions', venue: null, organizer_name: null }),
      makeInquiry({ id: 'y', event_name: null, venue: 'Cloud Nine', organizer_name: null }),
      makeInquiry({ id: 'z', event_name: null, venue: null, organizer_name: 'Mr Perera' }),
    ]
    const ev = f({ scope: 'everyone' })
    expect(applyFilters(l, { ...ev, search: 'SUNSET' }, ctx).map((i) => i.id)).toEqual(['x'])
    expect(applyFilters(l, { ...ev, search: 'cloud' }, ctx).map((i) => i.id)).toEqual(['y'])
    expect(applyFilters(l, { ...ev, search: 'perera' }, ctx).map((i) => i.id)).toEqual(['z'])
  })

  it('artist filter works and ignoreTimeframe lets the calendar span months', () => {
    expect(applyFilters(list, f({ scope: 'everyone', artist: 'imthxd' }), ctx).map((i) => i.id)).toEqual(['b', 'c'])
    expect(
      applyFilters(list, f({ scope: 'everyone', timeframe: 'past' }), ctx, { ignoreTimeframe: true }).map((i) => i.id),
    ).toEqual(['a', 'b', 'c', 'e'])
  })
})

describe('todayISO', () => {
  it('uses the local calendar date', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
