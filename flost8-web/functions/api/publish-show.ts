import { alreadySynced, toShow, type PublicInquiry } from '../../src/lib/manage/publicShow'
import type { AdminShow } from '../../src/lib/showsAdmin'
import type { Artist, Manager } from '../../src/lib/manage/types'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ADMIN_SECRET: string
  APPS_SCRIPT_URL: string
  /** Kill switch: nothing is written to the public Shows sheet unless this is exactly 'on'. */
  WEBSITE_PUBLISH?: string
  /** Test hook: pause between Apps Script retries, in ms (default 2000). */
  APPS_SCRIPT_RETRY_MS?: string
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const COLUMNS = 'id,source,status,owner_id,event_date,event_name,venue,city,set_time,ticket_link,updated_at,inquiry_artists(position,artist_slug)'
interface EventRow extends Omit<PublicInquiry, 'artists'> {
  id: string
  owner_id: string | null
  updated_at?: string
  inquiry_artists: { position: number; artist_slug: string }[]
}
interface Publication { inquiry_id: string; show_id: string | null; phase: 'idle' | 'adding' }
class Failure extends Error {
  status: number
  constructor(message: string, status = 502) { super(message); this.status = status }
}

function backend(env: Env) {
  const root = env.SUPABASE_URL.replace(/\/$/, '')
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' }
  async function db<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`${root}/rest/v1/${path}`, { method, headers: { ...headers, Prefer: 'return=representation' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Failure('Publication database request failed')
    return response.status === 204 ? undefined as T : await response.json() as T
  }
  // Apps Script serialises writes behind one lock that the 15-minute sheet sync also holds. When it answers
  // "Busy" it has done nothing yet, so every action (even the non-idempotent addShow) is safe to send again.
  async function script(action: string, args: Record<string, unknown> = {}) {
    const pause = Number(env.APPS_SCRIPT_RETRY_MS ?? 2000)
    for (let attempt = 1; ; attempt++) {
      const response = await fetch(env.APPS_SCRIPT_URL, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...args, secret: env.ADMIN_SECRET }), redirect: 'follow', signal: AbortSignal.timeout(15000) })
      if (!response.ok) throw new Failure('Website list request failed')
      const result = await response.json() as { ok?: boolean; errors?: { message?: string }[]; shows?: AdminShow[]; show?: AdminShow }
      if (result.ok === true) return result
      const reason = String(result.errors?.[0]?.message ?? '').slice(0, 80)
      if (reason === 'Busy, please retry' && attempt < 4) { await new Promise(r => setTimeout(r, pause)); continue }
      throw new Failure(reason ? `Website list request failed: ${reason}` : 'Website list request failed')
    }
  }
  const event = async (id: string) => (await db<EventRow[]>(`inquiries?select=${COLUMNS}&id=eq.${id}`))[0]
  return { db, script, event, root, headers }
}

async function publish(id: string, me: Manager, api: ReturnType<typeof backend>): Promise<string> {
  // Authorize BEFORE claiming or touching the public sheet. A deleted inquiry is allowed for any manager.
  const first = await api.event(id)
  if (first && me.role !== 'owner' && first.owner_id !== me.id) throw new Failure('Forbidden', 403)
  if (first && first.source !== 'manual') return 'not_app_event'
  const token = crypto.randomUUID()
  const claim = await api.db<Publication | null>('rpc/claim_website_publication', 'POST', { p_id: id, p_token: token })
  if (!claim) throw new Failure('Website update already in progress. Retry shortly.', 409)
  const lockPath = `website_publications?inquiry_id=eq.${id}&lock_token=eq.${token}`
  const finish = (showId: string | null) => api.db('rpc/finish_website_publication', 'POST', { p_id: id, p_token: token, p_show_id: showId })
  try {
    if (claim.phase === 'adding') throw new Failure('A previous website add has an uncertain result. Ask the owner to reconcile it before retrying.', 409)
    const row = await api.event(id)
    if (row && me.role !== 'owner' && row.owner_id !== me.id) throw new Failure('Forbidden', 403)
    const artists = row ? await api.db<Artist[]>('artists?select=slug,name,manager_id') : []
    const map = (event: EventRow | undefined) => event ? toShow({ ...event, artists: [...(event.inquiry_artists ?? [])].sort((a, b) => a.position - b.position).map(a => a.artist_slug) }, artists) : null
    const desired = map(row)
    const checkCurrent = async () => {
      const latest = await api.event(id)
      if (JSON.stringify(map(latest)) !== JSON.stringify(desired)) throw new Failure('Event changed during publication. Retry to update the website.', 409)
    }
    // The sheet's date column can turn a new row's text into a real Date (the grid grew past the text-formatted range),
    // and the live script then reads it back in UTC, one day early. Read the row back and rewrite it once: an update
    // lands in a now text-formatted row and sticks. If it still differs, say so instead of reporting success.
    const verify = async (id: string, want: AdminShow) => {
      const find = async () => ((await api.script('listShows')).shows ?? []).find(s => s.id === id)
      const stored = await find()
      if (!stored) throw new Failure('The website row was not found after saving. Retry.')
      if (stored.date === want.date) return
      await api.script('updateShow', { id, show: want })
      const again = await find()
      if (again?.date !== want.date) throw new Failure(`The website stored ${again?.date ?? 'no date'} instead of ${want.date}. Ask the owner to check the Shows sheet.`)
    }
    const listed = await api.script('listShows')
    if (!Array.isArray(listed.shows)) throw new Failure('Website list response was invalid')
    const shows = listed.shows
    let showId = claim.show_id
    if (showId?.startsWith('sync:')) throw new Failure('Invalid publication mapping', 409)
    const duplicate = desired && alreadySynced(desired, shows)
    if (!desired || duplicate) {
      if (showId && shows.some(s => s.id === showId)) await api.script('deleteShow', { id: showId })
      await finish(null)
      await checkCurrent()
      return duplicate ? 'already_synced' : 'unpublished'
    }
    if (showId && shows.some(s => s.id === showId)) {
      await api.script('updateShow', { id: showId, show: desired })
      await finish(showId)
      await verify(showId, desired)
    } else {
      // Persist BEFORE a non-idempotent add. A timeout/crash leaves this marker and blocks blind retries.
      const marked = await api.db<Publication[]>(lockPath, 'PATCH', { phase: 'adding' })
      if (marked.length !== 1) throw new Failure('Publication claim expired', 409)
      const added = await api.script('addShow', { show: desired })
      showId = added.show?.id ?? null
      if (!showId || showId.startsWith('sync:')) throw new Failure('Website add returned an invalid ID')
      await finish(showId)
      await verify(showId, desired)
    }
    // Saving in the app can race a website request. Report drift so Retry/resync reads the newest event.
    await checkCurrent()
    return 'published'
  } finally {
    // Keep the phase marker on uncertain adds. Release only this worker's fenced claim.
    await api.db(lockPath, 'PATCH', { lock_token: null, lock_until: null }).catch(() => undefined)
  }
}

export async function onRequest({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (request.method !== 'POST') return json({ ok: false }, 405)
  if (!/^Bearer \S+$/.test(request.headers.get('authorization') ?? '')) return json({ ok: false }, 401)
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.ADMIN_SECRET || !env.APPS_SCRIPT_URL) return json({ ok: false }, 503)
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 4096) return json({ ok: false }, 413)
    const raw = await request.text()
    if (raw.length > 4096) return json({ ok: false }, 413)
    let payload: { id?: string; action?: string; cursor?: string }
    try { payload = JSON.parse(raw) } catch { return json({ ok: false }, 400) }
    if (!payload || typeof payload !== 'object' || (payload.action !== 'resync' && (typeof payload.id !== 'string' || !UUID.test(payload.id)))) return json({ ok: false }, 400)
    const api = backend(env)
    const auth = await fetch(`${api.root}/auth/v1/user`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: request.headers.get('authorization')! }, signal: AbortSignal.timeout(10000) })
    if (!auth.ok) return json({ ok: false }, 401)
    const user = await auth.json() as { id?: string }
    if (!user.id) return json({ ok: false }, 401)
    const [me] = await api.db<Manager[]>(`managers?select=id,role,user_id&user_id=eq.${encodeURIComponent(user.id)}`)
    if (!me || !['manager', 'owner'].includes(me.role)) return json({ ok: false }, 403)
    if (env.WEBSITE_PUBLISH !== 'on') return json({ ok: true, outcome: 'disabled' })
    if (payload.action === 'resync') {
      if (me.role !== 'owner') return json({ ok: false }, 403)
      if (payload.cursor && !UUID.test(payload.cursor)) return json({ ok: false }, 400)
      // Keyset pagination over both sources includes mappings whose inquiries were deleted.
      // Three at a time also bounds the Apps Script latency and Pages subrequest count.
      const after = payload.cursor ? `&id=gt.${payload.cursor}` : ''
      const events = await api.db<{ id: string }[]>(`inquiries?select=id&source=eq.manual&order=id.asc&limit=3${after}`)
      const mappings = await api.db<{ inquiry_id: string }[]>(`website_publications?select=inquiry_id&order=inquiry_id.asc&limit=3${payload.cursor ? `&inquiry_id=gt.${payload.cursor}` : ''}`)
      const ids = [...new Set([...events.map(e => e.id), ...mappings.map(m => m.inquiry_id)])].sort().slice(0, 3)
      const results: { id: string; outcome?: string; error?: string }[] = []
      for (const id of ids) {
        try { results.push({ id, outcome: await publish(id, me, api) }) }
        catch (error) { results.push({ id, error: error instanceof Failure ? error.message : 'Website update failed' }) }
      }
      return json({ ok: true, results, cursor: ids.length === 3 ? ids[ids.length - 1] : null })
    }
    return json({ ok: true, outcome: await publish(payload.id!, me, api) })
  } catch (error) {
    return json({ ok: false, message: error instanceof Failure ? error.message : 'Website update failed' }, error instanceof Failure ? error.status : 502)
  }
}
