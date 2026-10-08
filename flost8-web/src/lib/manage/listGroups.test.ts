import { describe, expect, it } from 'vitest'
import { groupInquiries } from './listGroups'
import { makeInquiry } from './testFixtures'

const TODAY = '2026-10-08'
const money = (fee: number, currency: 'LKR' | 'USD' = 'LKR') => ({ currency, fee, advance: null, balance: null }) as never

describe('groupInquiries', () => {
  it('puts the same show on the same day under one card, one line per artist', () => {
    const a = makeInquiry({ id: 'a', event_name: 'Lunarverse', event_date: '2026-09-19', venue: 'Southern Coast', artists: ['anush'] })
    const b = makeInquiry({ id: 'b', event_name: ' lunarverse ', event_date: '2026-09-19', venue: 'southern coast', artists: ['the-professor'] })
    const groups = groupInquiries([a, b], TODAY)
    expect(groups).toHaveLength(1)
    expect(groups[0].shows).toHaveLength(1)
    expect(groups[0].shows[0].items.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('keeps different shows or different days apart', () => {
    const a = makeInquiry({ id: 'a', event_name: 'One Love', event_date: '2026-08-08' })
    const b = makeInquiry({ id: 'b', event_name: 'One Love', event_date: '2026-08-09' })
    const c = makeInquiry({ id: 'c', event_name: 'Other', event_date: '2026-08-08' })
    expect(groupInquiries([a, b, c], TODAY)[0].shows).toHaveLength(3)
  })

  it('never merges inquiries that have no date', () => {
    const a = makeInquiry({ id: 'a', event_name: 'X', event_date: null })
    const b = makeInquiry({ id: 'b', event_name: 'X', event_date: null })
    const groups = groupInquiries([a, b], TODAY)
    expect(groups).toHaveLength(1)
    expect(groups[0].side).toBe('undated')
    expect(groups[0].shows).toHaveLength(2)
  })

  it('groups by month, keeps the input order, and labels upcoming vs past', () => {
    const items = [
      makeInquiry({ id: 'u1', event_date: '2026-10-24', event_name: 'A' }),
      makeInquiry({ id: 'u2', event_date: '2026-11-02', event_name: 'B' }),
      makeInquiry({ id: 'p1', event_date: '2026-09-19', event_name: 'C' }),
      makeInquiry({ id: 'p2', event_date: '2026-08-08', event_name: 'D' }),
    ]
    const groups = groupInquiries(items, TODAY)
    expect(groups.map((g) => [g.key, g.side, g.label])).toEqual([
      ['upcoming-2026-10', 'upcoming', 'OCT 2026'],
      ['upcoming-2026-11', 'upcoming', 'NOV 2026'],
      ['past-2026-09', 'past', 'SEP 2026'],
      ['past-2026-08', 'past', 'AUG 2026'],
    ])
  })

  it('counts shows (not rows) and totals the fee when the currency is single', () => {
    const a = makeInquiry({ id: 'a', event_name: 'S', event_date: '2026-09-19', money: money(60000) })
    const b = makeInquiry({ id: 'b', event_name: 'S', event_date: '2026-09-19', money: money(60000) })
    const c = makeInquiry({ id: 'c', event_name: 'T', event_date: '2026-09-20', money: money(40000) })
    const [g] = groupInquiries([a, b, c], TODAY)
    expect(g.showCount).toBe(2)
    expect(g.fee).toEqual({ currency: 'LKR', total: 160000 })
  })

  it('shows no total when currencies are mixed or no money is visible', () => {
    const a = makeInquiry({ id: 'a', event_name: 'S', event_date: '2026-09-19', money: money(60000) })
    const b = makeInquiry({ id: 'b', event_name: 'T', event_date: '2026-09-20', money: money(500, 'USD') })
    expect(groupInquiries([a, b], TODAY)[0].fee).toBeNull()
    expect(groupInquiries([makeInquiry({ id: 'c', event_date: '2026-09-19' })], TODAY)[0].fee).toBeNull()
  })

  it('treats today as upcoming', () => {
    expect(groupInquiries([makeInquiry({ event_date: TODAY })], TODAY)[0].side).toBe('upcoming')
  })
})
