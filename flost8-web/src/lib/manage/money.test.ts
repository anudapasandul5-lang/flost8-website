import { describe, it, expect } from 'vitest'
import { formatAmount, paidInFull, parseAmountInput, totalsByCurrency } from './money'
import { makeInquiry } from './testFixtures'
import type { Money } from './types'

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

describe('formatAmount', () => {
  it('adds thousands separators and the currency', () => {
    expect(formatAmount(1250000, 'LKR')).toBe('LKR 1,250,000')
    expect(formatAmount(800.5, 'USD')).toBe('USD 800.5')
  })
  it('shows a dash for nothing', () => {
    expect(formatAmount(null, 'LKR')).toBe('-')
  })
})

describe('totalsByCurrency', () => {
  it('keeps LKR and USD apart and skips rows with no visible money', () => {
    const list = [
      makeInquiry({ id: '1', money: money({ fee: 100000, advance: 40000, balance: 60000 }) }),
      makeInquiry({ id: '2', money: money({ fee: 50000 }) }),
      makeInquiry({ id: '3', money: money({ currency: 'USD', fee: 800 }) }),
      makeInquiry({ id: '4', money: null }),
    ]
    expect(totalsByCurrency(list)).toEqual([
      { currency: 'LKR', count: 2, fee: 150000, advance: 40000, balance: 60000 },
      { currency: 'USD', count: 1, fee: 800, advance: 0, balance: 0 },
    ])
  })
  it('returns nothing when no money is visible', () => {
    expect(totalsByCurrency([makeInquiry()])).toEqual([])
  })
})

describe('parseAmountInput', () => {
  it('handles blanks, commas and junk', () => {
    expect(parseAmountInput('')).toBeNull()
    expect(parseAmountInput(' 1,500 ')).toBe(1500)
    expect(parseAmountInput('abc')).toBeUndefined()
  })
})

describe('paidInFull', () => {
  it('sets the deposit to the full quote and clears the balance and its note', () => {
    expect(paidInFull(money({ fee: 150000, advance: 50000, balance: 100000, balance_note: 'POSTPONED' }))).toEqual(
      money({ fee: 150000, advance: 150000, balance: 0, balance_note: null }),
    )
  })
  it('without a quote, the deposit becomes everything paid plus owed', () => {
    expect(paidInFull(money({ advance: 20000, balance: 30000 }))?.advance).toBe(50000)
  })
  it('returns null when nothing is owed', () => {
    expect(paidInFull(money({ fee: 100, advance: 100, balance: 0 }))).toBeNull()
    expect(paidInFull(money({ fee: 100 }))).toBeNull()
  })
})
