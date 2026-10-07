import { beforeEach, expect, it, vi } from 'vitest'

const pages: unknown[][] = []
const ranges: [number, number][] = []
vi.mock('./supabase', () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => ({
            range: async (from: number, to: number) => { ranges.push([from, to]); return { data: pages.shift() ?? [], error: null } },
          }),
        }),
      }),
    }),
    rpc: () => ({
      order: () => ({
        range: async (from: number, to: number) => { ranges.push([from, to]); return { data: pages.shift() ?? [], error: null } },
      }),
    }),
  }),
}))
import { fetchContacts, fetchContactStats } from './contactsApi'

beforeEach(() => { pages.length = 0; ranges.length = 0 })

it('pages past the 1000-row server cap until a short page', async () => {
  pages.push(Array.from({ length: 1000 }, (_, i) => ({ id: `a${i}` })), Array.from({ length: 1000 }, (_, i) => ({ id: `b${i}` })), [{ id: 'z' }])
  const all = await fetchContacts()
  expect(all).toHaveLength(2001)
  expect(ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
})
it('stops after one page when the book is small', async () => {
  pages.push([{ id: 'only' }])
  expect(await fetchContacts()).toHaveLength(1)
  expect(ranges).toHaveLength(1)
})
it('pages contact stats too (the cap applies to rpc results), so contact 1001 still gets its counts', async () => {
  pages.push(Array.from({ length: 1000 }, (_, i) => ({ contact_id: `a${i}`, any_count: 1 })), [{ contact_id: 'late', any_count: 2 }])
  const stats = await fetchContactStats('2026-10-07')
  expect(stats.size).toBe(1001)
  expect(stats.get('late')?.any_count).toBe(2)
  expect(ranges).toEqual([[0, 999], [1000, 1999]])
})
