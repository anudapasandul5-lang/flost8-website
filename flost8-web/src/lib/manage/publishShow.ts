import { getSupabase } from './supabase'

interface Result {
  ok: boolean
  outcome?: string
  message?: string
  cursor?: string | null
  results?: { id: string; outcome?: string; error?: string }[]
}

async function request(body: Record<string, unknown>): Promise<Result> {
  const { data, error } = await getSupabase().auth.getSession()
  if (error || !data.session) throw new Error('Sign in again to update the website.')
  const response = await fetch('/api/publish-show', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify(body) })
  const result = await response.json() as Result
  if (!response.ok || !result.ok) throw new Error(result.message ?? 'Website update failed')
  return result
}

export async function publishShow(id: string): Promise<string> {
  return (await request({ id })).outcome ?? 'published'
}

/** Every page includes deleted-event mappings. Retry safely starts again from the first page. */
export async function resyncWebsite(): Promise<void> {
  let cursor: string | null = null
  const failures: string[] = []
  do {
    const page: Result = await request({ action: 'resync', ...(cursor ? { cursor } : {}) })
    failures.push(...(page.results ?? []).filter(r => r.error).map(r => `${r.id}: ${r.error}`))
    cursor = page.cursor ?? null
  } while (cursor)
  if (failures.length) throw new Error(`${failures.length} website updates need attention. ${failures[0]}`)
}
