import { describe, expect, it } from 'vitest'
import { collapseFeed, type FeedRow } from './activityFeed'

let n = 0
const row = (over: Partial<FeedRow>): FeedRow => ({
  id: ++n,
  inquiry_id: 'i1',
  actor_id: 'm-kasuni',
  kind: 'comment',
  data: {},
  created_at: '2026-10-06T10:00:00Z',
  inquiry: { event_name: 'Wild Air', venue: null, owner_id: null },
  ...over,
})
const sync = (iso: string, over: Partial<FeedRow> = {}) => row({ actor_id: null, kind: 'money', created_at: iso, ...over })

describe('collapseFeed', () => {
  it('keeps rows with a person behind them, newest first', () => {
    const a = row({ created_at: '2026-10-06T10:00:00Z' })
    const b = row({ created_at: '2026-10-06T11:00:00Z' })
    const out = collapseFeed([b, a])
    expect(out.map((o) => o.kind)).toEqual(['row', 'row'])
  })

  it('collapses importer rows from one run into a single line with a count', () => {
    const out = collapseFeed([sync('2026-10-06T09:15:03Z'), sync('2026-10-06T09:15:02Z'), sync('2026-10-06T09:15:01Z', { kind: 'created' })])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ kind: 'sync', count: 3, at: '2026-10-06T09:15:03Z' })
  })

  it('splits importer rows from different runs', () => {
    const out = collapseFeed([sync('2026-10-06T09:30:01Z'), sync('2026-10-06T09:15:01Z')])
    expect(out.map((o) => o.kind)).toEqual(['sync', 'sync'])
  })

  it('keeps a person row that sits between two sync runs in order', () => {
    const person = row({ created_at: '2026-10-06T09:20:00Z' })
    const out = collapseFeed([sync('2026-10-06T09:30:01Z'), person, sync('2026-10-06T09:15:01Z')])
    expect(out.map((o) => o.kind)).toEqual(['sync', 'row', 'sync'])
  })

  it('returns nothing for nothing', () => {
    expect(collapseFeed([])).toEqual([])
  })
})
