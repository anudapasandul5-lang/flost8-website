import { describe, it, expect } from 'vitest'
import { formatAmount, parseAmountInput, totalsByCurrency } from './money'
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
