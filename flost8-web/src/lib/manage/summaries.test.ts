import { describe, it, expect } from 'vitest'
import { summarise } from './summaries'
import { makeInquiry } from './testFixtures'

const TODAY = '2026-10-10'
const money = (balance: number | null, currency: 'LKR' | 'USD' = 'LKR') => ({
  currency, fee: 100000, advance: 0, balance, balance_note: null, total: null, booking_fee: null,
})
const booked = (over = {}) => makeInquiry({ owner_id: 'm1', status: 'booking_confirmed', event_date: '2026-11-01', ...over })

describe('summarise', () => {
  it('counts only this manager\'s flagged rows and picks the most urgent reason', () => {
    const a = booked({ id: 'a' })
    const b = booked({ id: 'b' })
    const c = booked({ id: 'c', owner_id: 'm2' })
    const flagged = [
      { inquiry: a, reasons: ['no_reply' as const] },
      { inquiry: b, reasons: ['double_booked' as const, 'unpaid_soon' as const] },
      { inquiry: c, reasons: ['double_booked' as const] },
    ]
    const s = summarise('m1', [a, b, c], flagged, TODAY)
    expect(s.need).toBe(2)
    expect(s.top).toBe('double_booked')
  })
  it('is calm with no flags', () => {
    const s = summarise('m1', [booked()], [], TODAY)
    expect(s.need).toBe(0)
    expect(s.top).toBeNull()
  })
  it('counts upcoming booked and deposit-paid shows only', () => {
    const list = [
      booked({ id: '1' }),
      booked({ id: '2', status: 'deposit_paid' }),
      booked({ id: '3', event_date: '2026-10-09' }), // past
      booked({ id: '4', status: 'quoted' }),
      booked({ id: '5', owner_id: 'm2' }),
    ]
    expect(summarise('m1', list, [], TODAY).booked).toBe(2)
  })
  it('sums owed balance per currency, never mixing LKR and USD', () => {
    const list = [
      booked({ id: '1', money: money(45000) }),
      booked({ id: '2', money: money(5000) }),
      booked({ id: '3', money: money(400, 'USD') }),
      booked({ id: '4', money: money(null) }),
      booked({ id: '5', money: null }),
      booked({ id: '6', event_date: '2026-10-01', money: money(99999) }), // past: not owed-ahead
    ]
    expect(summarise('m1', list, [], TODAY).owed).toEqual([
      { currency: 'LKR', amount: 50000 },
      { currency: 'USD', amount: 400 },
    ])
  })
  it('has no owed entries when nothing is owed', () => {
    expect(summarise('m1', [booked({ money: money(0) })], [], TODAY).owed).toEqual([])
  })
})
