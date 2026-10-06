// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { onRequest } from './publish-show'

afterEach(() => vi.unstubAllGlobals())
const id = '11111111-1111-4111-8111-111111111111'
const env = { SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'key', ADMIN_SECRET: 'secret', APPS_SCRIPT_URL: 'https://script', WEBSITE_PUBLISH: 'on', APPS_SCRIPT_RETRY_MS: '0' }
const request = (body: unknown = { id }) => new Request('https://site/api/publish-show', { method: 'POST', headers: { authorization: 'Bearer access-token' }, body: JSON.stringify(body) })
const manager = { id: 'manager', role: 'manager', user_id: 'user' }
const inquiry = { id, source: 'manual', owner_id: 'manager', status: 'booking_confirmed', event_date: '2026-11-14', event_name: 'ZZ TEST - ignore', city: 'Colombo', venue: 'Factory', set_time: '10 pm', ticket_link: 'https://tickets.test', inquiry_artists: [{ position: 1, artist_slug: 'sonal' }], organizer_name: 'PRIVATE', organizer_phone: 'PRIVATE', notes: 'PRIVATE', fee: 'PRIVATE' }
function fakeBackend(options: { event?: typeof inquiry | null; role?: string; invalidToken?: boolean; noManager?: boolean; shows?: unknown[]; phase?: string; showId?: string | null; addFails?: boolean; locked?: boolean; touchOnFinish?: boolean; busy?: number; shiftDate?: 'add' | 'always' } = {}) {
  let busyLeft = options.busy ?? 0
  const store: Record<string, unknown>[] = [...((options.shows ?? []) as Record<string, unknown>[])]
  const dayBefore = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)
  const writes: Record<string, unknown>[] = []
  let mapping = { inquiry_id: id, show_id: options.showId ?? null, phase: options.phase ?? 'idle' }
  let finished = false
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (url.endsWith('/auth/v1/user')) return Response.json(options.invalidToken ? {} : { id: 'user' }, { status: options.invalidToken ? 401 : 200 })
    if (url.includes('/managers?')) return Response.json(options.noManager ? [] : [{ ...manager, role: options.role ?? 'manager' }])
    if (url.includes('/inquiries?')) return Response.json(options.event === null ? [] : [{ ...(options.event ?? inquiry), ...(finished && options.touchOnFinish ? { updated_at: '2026-10-07T00:00:00Z' } : {}) }])
    if (url.includes('/artists?')) return Response.json([{ slug: 'sonal', name: 'SONAL', manager_id: 'manager' }])
    if (url.endsWith('/rpc/claim_website_publication')) return Response.json(options.locked ? null : mapping)
    if (url.endsWith('/rpc/finish_website_publication')) { finished = true; mapping = { ...mapping, show_id: body.p_show_id, phase: 'idle' }; return new Response(null, { status: 204 }) }
    if (url.includes('/website_publications?')) {
      if (init?.method === 'PATCH') { mapping = { ...mapping, ...body }; return Response.json([mapping]) }
      return Response.json([mapping])
    }
    if (url === 'https://script') {
      if (body.action === 'listShows') return Response.json({ ok: true, shows: store })
      if (busyLeft > 0) { busyLeft -= 1; return Response.json({ ok: false, errors: [{ message: 'Busy, please retry' }] }) }
      writes.push(body)
      if (body.action === 'addShow' && options.addFails) throw new Error('Response lost')
      if (body.action === 'addShow') store.push({ ...body.show, id: 'generated-id', date: options.shiftDate ? dayBefore(body.show.date) : body.show.date })
      if (body.action === 'updateShow') { const at = store.findIndex(x => x.id === body.id); const row = { ...body.show, id: body.id, date: options.shiftDate === 'always' ? dayBefore(body.show.date) : body.show.date }; if (at >= 0) store[at] = row; else store.push(row) }
      if (body.action === 'deleteShow') { const at = store.findIndex(x => x.id === body.id); if (at >= 0) store.splice(at, 1) }
      return Response.json({ ok: true, show: { ...body.show, id: body.id ?? 'generated-id' }, deleted: true })
    }
    throw new Error('Unexpected URL ' + url)
  }))
  return { writes, mapping: () => mapping }
}
it('verifies tokens, rejects non-managers, wrong owners and manager resync', async () => {
  for (const [options, body, status] of [
    [{ invalidToken: true }, { id }, 401], [{ noManager: true }, { id }, 403],
    [{ event: { ...inquiry, owner_id: 'other' } }, { id }, 403], [{}, { action: 'resync' }, 403],
  ] as const) {
    const backend = fakeBackend(options)
    expect((await onRequest({ request: request(body), env })).status).toBe(status)
    expect(backend.writes).toEqual([])
  }
})
it('adds a whitelisted show and saves the generated ID for later deletion', async () => {
  const backend = fakeBackend()
  const result = await onRequest({ request: request(), env })
  expect(result.status).toBe(200)
  expect(backend.writes[0]).toMatchObject({ action: 'addShow', secret: 'secret', show: { venue: 'ZZ TEST - ignore', artist_display: 'SONAL' } })
  expect(Object.keys(backend.writes[0].show as object).sort()).toEqual(['artist', 'artist_display', 'city', 'date', 'ticket_link', 'time', 'venue'])
  expect(JSON.stringify(backend.writes)).not.toContain('PRIVATE')
  expect(backend.mapping().show_id).toBe('generated-id')
})
it('updates a mapped show without creating another one', async () => {
  const backend = fakeBackend({ showId: 'generated-id', shows: [{ id: 'generated-id' }] })
  expect((await onRequest({ request: request(), env })).status).toBe(200)
  expect(backend.writes.map(w => w.action)).toEqual(['updateShow'])
})
it('does not report a successful publication as stale when storing its ID updates the inquiry timestamp', async () => {
  fakeBackend({ touchOnFinish: true })
  expect((await onRequest({ request: request(), env })).status).toBe(200)
})
it.each(['tentative', 'new', 'quoted', 'reached_out', 'lost', 'spam'])('unpublishes mapped %s events', async status => {
  const backend = fakeBackend({ event: { ...inquiry, status }, showId: 'generated-id', shows: [{ id: 'generated-id' }, { id: 'sync:other' }] })
  expect((await onRequest({ request: request(), env })).status).toBe(200)
  expect(backend.writes).toEqual([{ action: 'deleteShow', id: 'generated-id', secret: 'secret' }])
  expect(backend.mapping().show_id).toBeNull()
})
it('uses the surviving mapping to remove a deleted event for any manager', async () => {
  const backend = fakeBackend({ event: null, showId: 'generated-id', shows: [{ id: 'generated-id' }] })
  expect((await onRequest({ request: request(), env })).status).toBe(200)
  expect(backend.writes[0]).toMatchObject({ action: 'deleteShow', id: 'generated-id' })
})
it('removes the app duplicate but never edits the synced show', async () => {
  const backend = fakeBackend({ showId: 'generated-id', shows: [{ id: 'generated-id' }, { id: 'sync:night', date: '2026-11-14', artist: 'sonal', artist_display: 'SONAL' }] })
  const result = await onRequest({ request: request(), env })
  expect(await result.json()).toMatchObject({ outcome: 'already_synced' })
  expect(backend.writes).toEqual([{ action: 'deleteShow', id: 'generated-id', secret: 'secret' }])
})
it('blocks concurrent calls and prevents a second add after a lost response', async () => {
  const busy = fakeBackend({ locked: true })
  expect((await onRequest({ request: request(), env })).status).toBe(409)
  expect(busy.writes).toEqual([])
  const uncertain = fakeBackend({ addFails: true })
  expect((await onRequest({ request: request(), env })).status).toBe(502)
  expect(uncertain.mapping().phase).toBe('adding')
  expect((await onRequest({ request: request(), env })).status).toBe(409)
  expect(uncertain.writes.filter(w => w.action === 'addShow')).toHaveLength(1)
})
it('allows owner reconciliation, including orphaned mappings, and refuses invalid IDs', async () => {
  const backend = fakeBackend({ role: 'owner', event: null, showId: 'generated-id', shows: [{ id: 'generated-id' }] })
  expect(await (await onRequest({ request: request({ action: 'resync' }), env })).json()).toMatchObject({ ok: true, results: [{ id, outcome: 'unpublished' }], cursor: null })
  expect(backend.writes[0]).toMatchObject({ action: 'deleteShow' })
  expect((await onRequest({ request: request({ id: 'sync:other' }), env })).status).toBe(400)
})
it('rejects a caller without a Supabase bearer token before making requests', async () => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  const response = await onRequest({ request: new Request('https://site/api/publish-show', { method: 'POST', body: JSON.stringify({ id: '11111111-1111-4111-8111-111111111111' }) }), env: { SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'key', ADMIN_SECRET: 'secret', APPS_SCRIPT_URL: 'https://script' } })
  expect(response.status).toBe(401)
  expect(fetcher).not.toHaveBeenCalled()
})

it('does nothing until WEBSITE_PUBLISH is on, and still rejects unauthenticated callers', async () => {
  const backend = fakeBackend()
  const off = { ...env, WEBSITE_PUBLISH: '' }
  const result = await onRequest({ request: request(), env: off })
  expect(await result.json()).toEqual({ ok: true, outcome: 'disabled' })
  expect(backend.writes).toEqual([])
  expect((fetch as unknown as { mock: { calls: string[][] } }).mock.calls.some(c => c[0] === 'https://script')).toBe(false)
  fakeBackend({ invalidToken: true })
  expect((await onRequest({ request: request(), env: off })).status).toBe(401)
})
it('retries when Apps Script says Busy (the 15-minute sheet sync holds the lock) and then unpublishes', async () => {
  const backend = fakeBackend({ event: { ...inquiry, status: 'tentative' }, showId: 'generated-id', shows: [{ id: 'generated-id', date: '2026-11-14' }], busy: 2 })
  expect((await onRequest({ request: request(), env })).status).toBe(200)
  expect(backend.writes).toEqual([{ action: 'deleteShow', id: 'generated-id', secret: 'secret' }])
  expect(backend.mapping().show_id).toBeNull()
})
it('gives up after repeated Busy and keeps the mapping so Retry can finish the job', async () => {
  const backend = fakeBackend({ event: { ...inquiry, status: 'tentative' }, showId: 'generated-id', shows: [{ id: 'generated-id', date: '2026-11-14' }], busy: 99 })
  const result = await onRequest({ request: request(), env })
  expect(result.status).toBe(502)
  expect((await result.json() as { message: string }).message).toMatch(/Busy/)
  expect(backend.mapping().show_id).toBe('generated-id')
})
it('repairs a date the sheet stored one day early (the cell was coerced to a Date)', async () => {
  const backend = fakeBackend({ shiftDate: 'add' })
  expect((await onRequest({ request: request(), env })).status).toBe(200)
  expect(backend.writes.map(w => w.action)).toEqual(['addShow', 'updateShow'])
  expect(backend.writes[1]).toMatchObject({ id: 'generated-id', show: { date: '2026-11-14' } })
  expect(backend.mapping().show_id).toBe('generated-id')
})
it('reports an error, never silent success, when the date cannot be corrected', async () => {
  const backend = fakeBackend({ shiftDate: 'always' })
  const result = await onRequest({ request: request(), env })
  expect(result.status).toBe(502)
  expect((await result.json() as { message: string }).message).toMatch(/2026-11-13.*2026-11-14/)
  expect(backend.mapping().show_id).toBe('generated-id')
})
