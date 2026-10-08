import { describe, it, expect } from 'vitest'
import { formatDate, groupByDate, monthGrid, monthTitle, shiftMonth } from './calendar'
import { makeInquiry } from './testFixtures'

describe('monthGrid', () => {
  it('starts on Monday and pads with neighbouring days (Oct 2026 starts on a Thursday)', () => {
    const g = monthGrid(2026, 9)
    expect(g.length).toBe(5)
    expect(g.every((w) => w.length === 7)).toBe(true)
    expect(g[0][0]).toEqual({ iso: '2026-09-28', day: 28, inMonth: false })
    expect(g[0][3]).toEqual({ iso: '2026-10-01', day: 1, inMonth: true })
    expect(g[4][6].iso).toBe('2026-11-01')
  })
  it('uses 6 weeks when the month needs them (Aug 2026 starts on a Saturday)', () => {
    expect(monthGrid(2026, 7).length).toBe(6)
  })
  it('handles a month that fits exactly in 4 weeks (Feb 2027 starts on a Monday)', () => {
    expect(monthGrid(2027, 1).length).toBe(4)
  })
})

describe('shiftMonth', () => {
  it('wraps across years both ways', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month0: 0 })
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month0: 11 })
  })
})

describe('groupByDate / formatting', () => {
  it('groups by event_date and ignores undated rows', () => {
    const m = groupByDate([
      makeInquiry({ id: 'a', event_date: '2026-11-14' }),
      makeInquiry({ id: 'b', event_date: '2026-11-14' }),
      makeInquiry({ id: 'c', event_date: null }),
    ])
    expect(m.get('2026-11-14')?.length).toBe(2)
    expect(m.size).toBe(1)
  })
  it('formats dates without timezone drift', () => {
    expect(formatDate('2026-10-06')).toBe('Tue 6 Oct 2026')
    expect(formatDate(null)).toBe('No date yet')
    expect(monthTitle(2026, 9)).toBe('October 2026')
  })
})
