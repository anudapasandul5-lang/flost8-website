import { describe, it, expect } from 'vitest'
import { moneyByMonth, pipeline, tiles } from './overview'
import { makeInquiry } from './testFixtures'
import type { Reason } from './needsAction'
import type { Inquiry, Money } from './types'

const TODAY = '2026-10-06'

const money = (over: Partial<Money>): Money => ({
  currency: 'LKR',
  fee: null,
  advance: null,
  balance: null,
  balance_note: null,
  total: null,
  booking_fee: null,
  ...over,
})

const row = (inquiry: Inquiry, ...reasons: Reason[]) => ({ inquiry, reasons })

describe('tiles', () => {
  it('counts waiting rows and breaks them down by most urgent reason', () => {
    const t = tiles(
      [],
      [
        row(makeInquiry({ id: '1' }), 'double_booked', 'no_reply'),
        row(makeInquiry({ id: '2' }), 'unpaid_soon'),
        row(makeInquiry({ id: '3' }), 'no_reply'),
        row(makeInquiry({ id: '4' }), 'no_reply'),
      ],
      TODAY,
    )
    expect(t.need).toEqual({
      count: 4,
      top: 'double_booked',
      byReason: { double_booked: 1, unpaid_soon: 1, no_reply: 2, quote_quiet: 0 },
    })
  })

  it('has no top reason when nothing is waiting', () => {
    expect(tiles([], [], TODAY).need).toEqual({
      count: 0,
      top: null,
      byReason: { double_booked: 0, unpaid_soon: 0, no_reply: 0, quote_quiet: 0 },
    })
  })

  it('counts only upcoming booked or deposit-paid shows and names the next one', () => {
    const list = [
      makeInquiry({ id: 'past', status: 'booking_confirmed', event_date: '2026-10-01' }),
      makeInquiry({ id: 'far', status: 'deposit_paid', event_date: '2026-12-20' }),
      makeInquiry({ id: 'soon', status: 'booking_confirmed', event_date: '2026-10-09' }),
      makeInquiry({ id: 'quote', status: 'quoted', event_date: '2026-10-08' }),
      makeInquiry({ id: 'today', status: 'booking_confirmed', event_date: TODAY }),
    ]
    const t = tiles(list, [], TODAY)
    expect(t.booked.count).toBe(3)
    expect(t.booked.next?.id).toBe('today')
  })

  it('totals what is still owed per currency and what falls due within 7 days', () => {
    const list = [
      makeInquiry({ id: 'a', status: 'booking_confirmed', event_date: '2026-10-09', money: money({ balance: 45000 }) }),
      makeInquiry({ id: 'b', status: 'deposit_paid', event_date: '2026-10-13', money: money({ balance: 5000 }) }), // exactly 7 days out: counts
      makeInquiry({ id: 'c', status: 'booking_confirmed', event_date: '2026-10-14', money: money({ balance: 100000 }) }),
      makeInquiry({ id: 'd', status: 'booking_confirmed', event_date: '2026-11-01', money: money({ currency: 'USD', balance: 800 }) }),
      makeInquiry({ id: 'e', status: 'booking_confirmed', event_date: '2026-10-10', money: money({ balance: 0 }) }),
      makeInquiry({ id: 'f', status: 'quoted', event_date: '2026-10-10', money: money({ balance: 9999 }) }), // not booked
      makeInquiry({ id: 'g', status: 'booking_confirmed', event_date: '2026-10-10', money: null }), // money hidden
    ]
    expect(tiles(list, [], TODAY).owed).toEqual([
      { currency: 'LKR', amount: 150000, dueSoon: 50000 },
      { currency: 'USD', amount: 800, dueSoon: 0 },
    ])
  })

  it('gives a deposit percentage per currency over upcoming live inquiries, never mixing currencies', () => {
    const list = [
      makeInquiry({ id: 'a', status: 'booking_confirmed', event_date: '2026-10-20', money: money({ fee: 200000, advance: 50000 }) }),
      makeInquiry({ id: 'b', status: 'quoted', event_date: '2026-11-20', money: money({ fee: 100000, advance: 0 }) }),
      makeInquiry({ id: 'c', status: 'booking_confirmed', event_date: '2026-11-02', money: money({ currency: 'USD', fee: 1000, advance: 500 }) }),
      makeInquiry({ id: 'lost', status: 'lost', event_date: '2026-11-20', money: money({ fee: 999999, advance: 0 }) }),
      makeInquiry({ id: 'past', status: 'booking_confirmed', event_date: '2026-09-01', money: money({ fee: 999999, advance: 0 }) }),
    ]
    expect(tiles(list, [], TODAY).deposits).toEqual([
      { currency: 'LKR', quoted: 300000, collected: 50000, pct: 17 },
      { currency: 'USD', quoted: 1000, collected: 500, pct: 50 },
    ])
  })

  it('leaves pct null when nothing is quoted', () => {
    const list = [makeInquiry({ status: 'new', event_date: '2026-11-20', money: money({ fee: 0, advance: 0 }) })]
    expect(tiles(list, [], TODAY).deposits).toEqual([{ currency: 'LKR', quoted: 0, collected: 0, pct: null }])
  })
})

describe('pipeline', () => {
  it('counts each status in order, leaves spam out, and reports the booked share', () => {
    const mk = (status: Inquiry['status'], n: number) => Array.from({ length: n }, (_, k) => makeInquiry({ id: `${status}${k}`, status }))
    const list = [...mk('new', 2), ...mk('reached_out', 1), ...mk('quoted', 1), ...mk('booking_confirmed', 1), ...mk('lost', 1), ...mk('spam', 5)]
    expect(pipeline(list)).toEqual({
      total: 6,
      bookedPct: 17,
      stages: [
        { status: 'new', count: 2 },
        { status: 'reached_out', count: 1 },
        { status: 'quoted', count: 1 },
        { status: 'deposit_paid', count: 0 },
        { status: 'booking_confirmed', count: 1 },
        { status: 'lost', count: 1 },
      ],
    })
  })

  it('has a null booked share when empty', () => {
    expect(pipeline([]).bookedPct).toBeNull()
  })
})

describe('moneyByMonth', () => {
  it('returns last month plus the next months, zero-filled, quoted and deposits in LKR', () => {
    const list = [
      makeInquiry({ id: 'sep', event_date: '2026-09-15', money: money({ fee: 100, advance: 40 }) }),
      makeInquiry({ id: 'oct1', event_date: '2026-10-09', money: money({ fee: 200, advance: 50 }) }),
      makeInquiry({ id: 'oct2', event_date: '2026-10-31', money: money({ fee: 300, advance: 0 }) }),
      makeInquiry({ id: 'feb', event_date: '2027-02-10', money: money({ fee: 700, advance: 70 }) }),
    ]
    const r = moneyByMonth(list, TODAY)
    expect(r.months.map((m) => m.key)).toEqual(['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02'])
    expect(r.months.map((m) => m.label)).toEqual(['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'])
    expect(r.months.map((m) => [m.quoted, m.deposits])).toEqual([
      [100, 40],
      [500, 50],
      [0, 0],
      [0, 0],
      [0, 0],
      [700, 70],
    ])
  })

  it('skips and counts rows with no visible money, USD rows, and ignores lost, spam, undated and out-of-window rows', () => {
    const list = [
      makeInquiry({ id: 'hidden', event_date: '2026-10-09', money: null }),
      makeInquiry({ id: 'hidden2', event_date: '2026-11-09', money: null }),
      makeInquiry({ id: 'usd', event_date: '2026-10-09', money: money({ currency: 'USD', fee: 800, advance: 100 }) }),
      makeInquiry({ id: 'lost', status: 'lost', event_date: '2026-10-09', money: money({ fee: 1000 }) }),
      makeInquiry({ id: 'spam', status: 'spam', event_date: '2026-10-09', money: null }),
      makeInquiry({ id: 'undated', event_date: null, money: null }),
      makeInquiry({ id: 'old', event_date: '2026-07-01', money: null }),
      makeInquiry({ id: 'ok', event_date: '2026-10-09', money: money({ fee: 10, advance: 1 }) }),
    ]
    const r = moneyByMonth(list, TODAY)
    expect(r.skipped).toBe(2)
    expect(r.otherCurrency).toBe(1)
    expect(r.months.find((m) => m.key === '2026-10')).toMatchObject({ quoted: 10, deposits: 1 })
  })

  it('wraps across a year boundary', () => {
    const r = moneyByMonth([], '2026-01-20')
    expect(r.months.map((m) => m.key)).toEqual(['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'])
  })
})
