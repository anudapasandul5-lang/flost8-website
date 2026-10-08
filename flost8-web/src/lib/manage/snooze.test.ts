import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls: { patch: unknown; id: string }[] = []
let result: { data: unknown; error: unknown } = { data: [{ id: 'x' }], error: null }
vi.mock('./supabase', () => ({
  getSupabase: () => ({
    from: () => ({
      update: (patch: unknown) => ({
        eq: (_c: string, id: string) => ({
          select: async () => {
            calls.push({ patch, id })
            return result
          },
        }),
      }),
    }),
  }),
}))
import { NotAllowedError, snoozeInquiry } from './api'
import { isSnoozed, snoozeChoices, snoozedLabel } from './snooze'

// 2026-10-07 is a Wednesday.
describe('snoozeChoices', () => {
  it('offers tomorrow and the coming Friday', () => {
    const c = snoozeChoices('2026-10-07')
    expect(c).toEqual([
      { label: 'Tomorrow', date: '2026-10-08' },
      { label: 'Friday', date: '2026-10-09' },
    ])
  })
  it('drops Friday when tomorrow already is Friday', () => {
    expect(snoozeChoices('2026-10-08').map((c) => c.label)).toEqual(['Tomorrow'])
  })
  it('on a Friday, Friday means next week', () => {
    expect(snoozeChoices('2026-10-09')).toEqual([
      { label: 'Tomorrow', date: '2026-10-10' },
      { label: 'Friday', date: '2026-10-16' },
    ])
  })
  it('rolls over a month end', () => {
    expect(snoozeChoices('2026-10-31')[0].date).toBe('2026-11-01')
  })
})

describe('isSnoozed', () => {
  it('is true only while the date is in the future', () => {
    expect(isSnoozed({ snoozed_until: '2026-10-08' }, '2026-10-07')).toBe(true)
    expect(isSnoozed({ snoozed_until: '2026-10-07' }, '2026-10-07')).toBe(false)
    expect(isSnoozed({ snoozed_until: '2026-10-01' }, '2026-10-07')).toBe(false)
    expect(isSnoozed({ snoozed_until: null }, '2026-10-07')).toBe(false)
  })
})

describe('snoozedLabel', () => {
  it('uses the short weekday within 7 days', () => {
    expect(snoozedLabel('2026-10-09', '2026-10-07')).toBe('Snoozed till Fri')
    expect(snoozedLabel('2026-10-14', '2026-10-07')).toBe('Snoozed till Wed')
  })
  it('uses the date beyond 7 days', () => {
    expect(snoozedLabel('2026-10-15', '2026-10-07')).toBe('Snoozed till Thu 15 Oct 2026')
  })
})

describe('snoozeInquiry', () => {
  beforeEach(() => {
    calls.length = 0
    result = { data: [{ id: 'x' }], error: null }
  })
  it('sets the date', async () => {
    await snoozeInquiry('i1', '2026-10-09')
    expect(calls).toEqual([{ id: 'i1', patch: { snoozed_until: '2026-10-09' } }])
  })
  it('clears it with null (Unsnooze)', async () => {
    await snoozeInquiry('i1', null)
    expect(calls[0].patch).toEqual({ snoozed_until: null })
  })
  it('refuses something that is not a date', async () => {
    await expect(snoozeInquiry('i1', 'friday')).rejects.toThrow(/date/)
    expect(calls).toHaveLength(0)
  })
  it('reports a row the database filtered out as not allowed', async () => {
    result = { data: [], error: null }
    await expect(snoozeInquiry('i1', '2026-10-09')).rejects.toBeInstanceOf(NotAllowedError)
  })
})
