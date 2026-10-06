import { getSupabase } from './supabase'
import type { BookedRow } from './conflicts'
import type { FeedRow } from './activityFeed'
import { toInquiryRow, toMoneyRow, type NewEventInput } from './newEvent'
import type { ActivityRow, Artist, Currency, Inquiry, Manager, Money, Status } from './types'

/** Thrown when the database refuses a write (row-level security). */
export class NotAllowedError extends Error {
  constructor() {
    super('You can view this but not change it')
    this.name = 'NotAllowedError'
  }
}

/** Plain-English message for anything that goes wrong. */
export function friendlyError(err: unknown): string {
  if (err instanceof NotAllowedError) return err.message
  const msg = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : ''
  if (typeof err === 'object' && err && 'code' in err && (err as { code: unknown }).code === '23514') return 'That link is not allowed. Use an address that starts with https://'
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return 'Could not reach the server. Check your internet and try again.'
  return 'Something went wrong. Please try again.'
}

function isRlsError(err: { code?: string; message?: string }): boolean {
  return err.code === '42501' || /row-level security/i.test(err.message ?? '')
}

export async function fetchManager(userId: string): Promise<Manager | null> {
  const { data, error } = await getSupabase()
    .from('managers')
    .select('id,name,email,role,user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as Manager | null) ?? null
}

export async function fetchDirectory(): Promise<{ managers: Manager[]; artists: Artist[] }> {
  const sb = getSupabase()
  const [m, a] = await Promise.all([
    sb.from('managers').select('id,name,email,role,user_id'),
    sb.from('artists').select('slug,name,manager_id').order('name'),
  ])
  if (m.error) throw m.error
  if (a.error) throw a.error
  return { managers: m.data as Manager[], artists: a.data as Artist[] }
}

const INQUIRY_COLUMNS =
  'id,created_at,updated_at,status,source,owner_id,sheet_updated_at,set_type,event_name,event_date,venue,city,event_type,set_duration_h,set_time,deal_type,lead_source,platform,brand,collab_type,invoice_no,organizer_name,organizer_phone,organizer_email,other_artists,notes,contract_signed,contract_url,travel_notes,lost_reason'

interface RawInquiry extends Omit<Inquiry, 'artists' | 'money'> {
  inquiry_artists: { position: number; artist_slug: string }[] | null
  inquiry_money: Money | Money[] | null
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))

function normaliseMoney(raw: Money | Money[] | null): Money | null {
  const m = Array.isArray(raw) ? raw[0] : raw
  if (!m) return null
  return {
    currency: (m.currency as Currency) ?? 'LKR',
    fee: num(m.fee),
    advance: num(m.advance),
    balance: num(m.balance),
    balance_note: m.balance_note ?? null,
    total: num(m.total),
    booking_fee: num(m.booking_fee),
  }
}

function normalise(r: RawInquiry): Inquiry {
  const { inquiry_artists, inquiry_money, ...rest } = r
  return {
    ...rest,
    set_duration_h: num(rest.set_duration_h),
    artists: [...(inquiry_artists ?? [])].sort((a, b) => a.position - b.position).map((x) => x.artist_slug),
    money: normaliseMoney(inquiry_money),
  }
}

export async function fetchInquiries(): Promise<Inquiry[]> {
  const { data, error } = await getSupabase()
    .from('inquiries')
    .select(`${INQUIRY_COLUMNS},inquiry_artists(position,artist_slug),inquiry_money(*)`)
    .order('event_date', { ascending: false, nullsFirst: false })
    .limit(1000)
  if (error) throw error
  return (data as unknown as RawInquiry[]).map(normalise)
}

/** inquiry id -> last_touch (latest of updated_at and newest comment/status activity). RLS limits it to rows this user can see. */
export async function fetchLastTouch(): Promise<Map<string, string>> {
  const { data, error } = await getSupabase().from('inquiry_last_touch').select('inquiry_id,last_touch').limit(1000)
  if (error) throw error
  return new Map((data as { inquiry_id: string; last_touch: string }[]).map((r) => [r.inquiry_id, r.last_touch]))
}

export async function fetchActivity(inquiryId: string): Promise<ActivityRow[]> {
  const { data, error } = await getSupabase()
    .from('activity')
    .select('id,actor_id,kind,data,created_at')
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
  if (error) throw error
  return data as ActivityRow[]
}

/** Newest activity across every event this user can see (RLS: activity_read = can_view(inquiry)), with each event's name. */
export async function fetchRecentActivity(limit: number): Promise<FeedRow[]> {
  const { data, error } = await getSupabase()
    .from('activity')
    .select('id,inquiry_id,actor_id,kind,data,created_at,inquiries(event_name,venue,owner_id)')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)
  if (error) throw error
  type Raw = Omit<FeedRow, 'inquiry'> & { inquiries: FeedRow['inquiry'] | FeedRow['inquiry'][] }
  return (data as unknown as Raw[]).map(({ inquiries, ...r }) => ({ ...r, inquiry: (Array.isArray(inquiries) ? inquiries[0] : inquiries) ?? null }))
}

/** Confirmed inquiries on one date, fresh from the database, for the double-booking check. */
export async function fetchConfirmedOnDate(date: string, exceptId: string): Promise<BookedRow[]> {
  const { data, error } = await getSupabase()
    .from('inquiries')
    .select('id,event_name,venue,inquiry_artists(artist_slug)')
    .eq('event_date', date)
    .eq('status', 'booking_confirmed')
    .neq('id', exceptId)
  if (error) throw error
  return (data as unknown as { id: string; event_name: string | null; venue: string | null; inquiry_artists: { artist_slug: string }[] | null }[]).map(
    (r) => ({ id: r.id, event_name: r.event_name, venue: r.venue, artists: (r.inquiry_artists ?? []).map((x) => x.artist_slug) }),
  )
}

export interface InquiryPatch {
  status?: Status
  notes?: string | null
  contract_signed?: boolean
  contract_url?: string | null
  travel_notes?: string | null
}

/** An update the database silently filters out comes back as zero rows; treat that as "not allowed". */
export async function updateInquiry(id: string, patch: InquiryPatch): Promise<void> {
  const { data, error } = await getSupabase().from('inquiries').update(patch).eq('id', id).select('id')
  if (error) {
    if (isRlsError(error)) throw new NotAllowedError()
    throw error
  }
  if (!data || data.length === 0) throw new NotAllowedError()
}

export async function addComment(inquiryId: string, actorId: string, text: string): Promise<void> {
  const { error } = await getSupabase()
    .from('activity')
    .insert({ inquiry_id: inquiryId, actor_id: actorId, kind: 'comment', data: { text } })
  if (error) {
    if (isRlsError(error)) throw new NotAllowedError()
    throw error
  }
}

export async function saveMoney(inquiryId: string, money: Money): Promise<void> {
  const { error } = await getSupabase()
    .from('inquiry_money')
    .upsert({ inquiry_id: inquiryId, ...money }, { onConflict: 'inquiry_id' })
  if (error) {
    if (isRlsError(error)) throw new NotAllowedError()
    throw error
  }
}

/**
 * Saves an event added from the app: the inquiry, its lineup, then its money. Three inserts, so a failure part-way leaves a
 * partial row (managers cannot delete); it is reported and the manager can open the row and finish it.
 */
/** crypto.randomUUID only exists on https and localhost; fall back so the form still works over plain http. */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export async function createEvent(input: NewEventInput, ownerId: string | null, id: string): Promise<string> {
  const sb = getSupabase()
  // The id is made here and the insert asks for nothing back: a manager's "can I read the new row" check
  // (can_view) cannot see a row created in the same statement, so insert ... returning is refused for managers.
  // The caller keeps the same id across retries, so a retry after a partial failure finishes the same row instead of making a second one:
  // 23505 (duplicate key) means an earlier attempt already created it.
  const made = await sb.from('inquiries').insert({ id, ...toInquiryRow(input, ownerId) })
  if (made.error && made.error.code !== '23505') {
    if (isRlsError(made.error)) throw new NotAllowedError()
    throw made.error
  }
  const lineup = await sb
    .from('inquiry_artists')
    .upsert(
      input.artists.map((artist_slug, n) => ({ inquiry_id: id, position: n + 1, artist_slug })),
      { onConflict: 'inquiry_id,position', ignoreDuplicates: true },
    )
  if (lineup.error) throw lineup.error
  const money = toMoneyRow(input)
  if (money) await saveMoney(id, money)
  return id
}

/** Permanent. Comments, lineup and money go with it (cascade). A delete the database filters out comes back as zero rows. */
export async function deleteInquiry(id: string): Promise<void> {
  const { data, error } = await getSupabase().from('inquiries').delete().eq('id', id).select('id')
  if (error) {
    if (isRlsError(error)) throw new NotAllowedError()
    throw error
  }
  if (!data || data.length === 0) throw new NotAllowedError()
}
