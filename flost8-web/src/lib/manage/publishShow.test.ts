import { afterEach, beforeEach, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 't' } }, error: null }) } }) }))
import { publishShow, resyncWebsite } from './publishShow'

const reply = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as Response)
beforeEach(() => vi.unstubAllGlobals())
afterEach(() => vi.unstubAllGlobals())

it('resync does not claim success while website publishing is switched off', async () => {
  vi.stubGlobal('fetch', reply({ ok: true, outcome: 'disabled' }))
  await expect(resyncWebsite()).rejects.toThrow(/switched off/)
})

it('resync walks every page and reports failures', async () => {
  const f = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, results: [{ id: 'a', outcome: 'published' }], cursor: 'a' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, results: [{ id: 'b', error: 'boom' }], cursor: null }) })
  vi.stubGlobal('fetch', f)
  await expect(resyncWebsite()).rejects.toThrow(/1 website updates need attention/)
  expect(f).toHaveBeenCalledTimes(2)
})

it('publishShow returns the server outcome', async () => {
  vi.stubGlobal('fetch', reply({ ok: true, outcome: 'held_back' }))
  expect(await publishShow('x')).toBe('held_back')
})
