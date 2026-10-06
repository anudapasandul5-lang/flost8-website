import { describe, it, expect } from 'vitest'
import { needsAction, REASON_RANK, type NeedsActionContext } from './needsAction'
import { makeInquiry, KASUNI, OWNER } from './testFixtures'

const NOW = new Date('2026-10-10T12:00:00Z')
const TODAY = '2026-10-10'
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString()

function ctx(over: Partial<NeedsActionContext> = {}): NeedsActionContext {
  return { today: TODAY, now: NOW, lastTouch: new Map(), conflicts: new Set(), meId: KASUNI.id, isOwner: false, ...over }
}
const mine = (over = {}) => makeInquiry({ owner_id: KASUNI.id, ...over })
const money = (balance: number | null) => ({
  currency: 'LKR' as const, fee: 100000, advance: 55000, balance, balance_note: null, total: null, booking_fee: null,
})

describe('no_reply', () => {
  it('flags a new inquiry untouched for more than 24 hours', () => {
    const i = mine({ id: 'a', status: 'new' })
    expect(needsAction(i, ctx({ lastTouch: new Map([['a', hoursAgo(25)]]) }))).toEqual(['no_reply'])
  })
  it('does not flag at exactly 24 hours or less', () => {
    const i = mine({ id: 'a', status: 'new' })
    expect(needsAction(i, ctx({ lastTouch: new Map([['a', hoursAgo(24)]]) }))).toEqual([])
  })
  it('a fresh comment (new last touch) clears it', () => {
    const i = mine({ id: 'a', status: 'new' })
    expect(needsAction(i, ctx({ lastTouch: new Map([['a', hoursAgo(1)]]) }))).toEqual([])
  })
  it('falls back to updated_at when the view has no row', () => {
    const i = mine({ id: 'a', status: 'new', updated_at: hoursAgo(30) })
    expect(needsAction(i, ctx())).toEqual(['no_reply'])
  })
})

describe('quote_quiet', () => {
  it('flags a quote with no touch for more than 5 days', () => {
    const i = mine({ id: 'q', status: 'quoted' })
    expect(needsAction(i, ctx({ lastTouch: new Map([['q', hoursAgo(5 * 24 + 1)]]) }))).toEqual(['quote_quiet'])
  })
  it('does not flag at 5 days or less', () => {
    const i = mine({ id: 'q', status: 'quoted' })
    expect(needsAction(i, ctx({ lastTouch: new Map([['q', hoursAgo(5 * 24)]]) }))).toEqual([])
  })
})

describe('unpaid_soon', () => {
  it.each(['booking_confirmed', 'deposit_paid'] as const)('flags %s within 14 days with a balance', (status) => {
    const i = mine({ status, event_date: '2026-10-24', money: money(45000) })
    expect(needsAction(i, ctx())).toEqual(['unpaid_soon'])
  })
  it('flags a show today', () => {
    expect(needsAction(mine({ status: 'booking_confirmed', event_date: TODAY, money: money(1) }), ctx())).toEqual(['unpaid_soon'])
  })
  it('skips shows more than 14 days out', () => {
    expect(needsAction(mine({ status: 'booking_confirmed', event_date: '2026-10-25', money: money(45000) }), ctx())).toEqual([])
  })
  it('skips a zero or missing balance, and hidden money', () => {
    expect(needsAction(mine({ status: 'booking_confirmed', event_date: '2026-10-12', money: money(0) }), ctx())).toEqual([])
    expect(needsAction(mine({ status: 'booking_confirmed', event_date: '2026-10-12', money: money(null) }), ctx())).toEqual([])
    expect(needsAction(mine({ status: 'booking_confirmed', event_date: '2026-10-12', money: null }), ctx())).toEqual([])
  })
})

describe('double_booked', () => {
  it('flags ids in the conflict set', () => {
    const i = mine({ id: 'd', status: 'booking_confirmed', event_date: '2026-12-01' })
    expect(needsAction(i, ctx({ conflicts: new Set(['d']) }))).toEqual(['double_booked'])
  })
})

describe('never flagged', () => {
  it('lost and spam', () => {
    for (const status of ['lost', 'spam'] as const) {
      const i = mine({ id: 'x', status, updated_at: hoursAgo(999) })
      expect(needsAction(i, ctx({ conflicts: new Set(['x']) }))).toEqual([])
    }
  })
  it('past events', () => {
    const i = mine({ id: 'p', status: 'booking_confirmed', event_date: '2026-10-09', money: money(5000) })
    expect(needsAction(i, ctx({ conflicts: new Set(['p']) }))).toEqual([])
  })
  it('an undated new inquiry can still be flagged (no date is not past)', () => {
    const i = mine({ id: 'n', status: 'new', event_date: null })
    expect(needsAction(i, ctx({ lastTouch: new Map([['n', hoursAgo(48)]]) }))).toEqual(['no_reply'])
  })
})

describe('who sees what (Q13)', () => {
  const stale = new Map([['a', hoursAgo(48)]])
  it("a manager gets flags only on rows they own", () => {
    expect(needsAction(makeInquiry({ id: 'a', owner_id: 'm-nirbheeth' }), ctx({ lastTouch: stale }))).toEqual([])
    expect(needsAction(makeInquiry({ id: 'a', owner_id: null }), ctx({ lastTouch: stale }))).toEqual([])
    expect(needsAction(makeInquiry({ id: 'a', owner_id: KASUNI.id }), ctx({ lastTouch: stale }))).toEqual(['no_reply'])
  })
  it('the owner sees flags on every row', () => {
    const c = ctx({ lastTouch: stale, meId: OWNER.id, isOwner: true })
    expect(needsAction(makeInquiry({ id: 'a', owner_id: 'm-nirbheeth' }), c)).toEqual(['no_reply'])
    expect(needsAction(makeInquiry({ id: 'a', owner_id: null }), c)).toEqual(['no_reply'])
  })
})

describe('ordering', () => {
  it('returns reasons most urgent first, matching REASON_RANK', () => {
    const i = mine({ id: 'm', status: 'booking_confirmed', event_date: '2026-10-12', money: money(9000) })
    const r = needsAction(i, ctx({ conflicts: new Set(['m']) }))
    expect(r).toEqual(['double_booked', 'unpaid_soon'])
    expect(REASON_RANK.double_booked).toBeLessThan(REASON_RANK.unpaid_soon)
    expect(REASON_RANK.unpaid_soon).toBeLessThan(REASON_RANK.no_reply)
    expect(REASON_RANK.no_reply).toBeLessThan(REASON_RANK.quote_quiet)
  })
})
