import { isPlainEmail } from './access'
import type { Inquiry } from './types'

export const CONTACT_TYPES = ['client', 'venue', 'promoter', 'artist', 'supplier', 'sponsor'] as const
export type ContactType = (typeof CONTACT_TYPES)[number]
export const TYPE_LABEL: Record<ContactType, string> = {
  client: 'Client',
  venue: 'Venue',
  promoter: 'Promoter',
  artist: 'Artist',
  supplier: 'Supplier',
  sponsor: 'Sponsor',
}

export type Stage = 'lead' | 'active' | 'past' | 'dormant'
export const STAGE_LABEL: Record<Stage, string> = { lead: 'Lead', active: 'Active', past: 'Past', dormant: 'Dormant' }
/** No upcoming booking and nothing logged for more than this many days = dormant. */
export const DORMANT_DAYS = 90

export interface Contact {
  id: string
  name: string
  types: ContactType[]
  phones: string[]
  whatsapp: string | null
  emails: string[]
  organisation: string | null
  city: string | null
  instagram: string | null
  language: string | null
  owner_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
  merged_into: string | null
}

/** Dates and counts from contact_stats(): never money. */
export interface ContactStats {
  contact_id: string
  any_count: number
  booked_count: number
  next_booked_date: string | null
  last_booked_date: string | null
  last_inquiry_touch: string | null
  last_note_at: string | null
}

export type NoteKind = 'note' | 'call' | 'whatsapp' | 'email' | 'meeting'
export const NOTE_LABEL: Record<NoteKind, string> = { note: 'Note', call: 'Call', whatsapp: 'WhatsApp', email: 'Email', meeting: 'Meeting' }

export interface ContactNote {
  id: string
  contact_id: string
  author_id: string | null
  kind: NoteKind
  body: string
  inquiry_id: string | null
  created_at: string
}

export interface ContactHistoryRow {
  id: number
  contact_id: string
  actor_id: string | null
  kind: string
  data: Record<string, unknown>
  created_at: string
}

export interface Reminder {
  id: string
  inquiry_id: string | null
  contact_id: string | null
  manager_id: string
  due_at: string
  note: string | null
  done: boolean
  done_at: string | null
  created_at: string
}

export interface MessageTemplate {
  id: string
  title: string
  language: string
  body: string
  archived: boolean
}

/** The contact form. Lists are arrays here; blanks are dropped when it is saved. */
export interface ContactInput {
  name: string
  types: ContactType[]
  phones: string[]
  whatsapp: string
  emails: string[]
  organisation: string
  city: string
  instagram: string
  language: string
  owner_id: string | null
  notes: string
}

export const EMPTY_CONTACT: ContactInput = {
  name: '', types: [], phones: [''], whatsapp: '', emails: [''], organisation: '', city: '', instagram: '', language: '', owner_id: null, notes: '',
}

// ---------- keys ----------

/** Lowercase, collapsed spacing: the "same name" test used for seeding, duplicates and search. */
export function normName(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** The digits that identify a line, so 0771234567, +94 77 123 4567 and 0094771234567 all match. Any length. */
function phoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('94')) d = d.slice(2)
  else if (d.startsWith('0')) d = d.slice(1)
  return d
}

/** Empty when it is not a usable number (under 7 digits). */
export function phoneKey(raw: string): string {
  const d = phoneDigits(raw)
  return d.length >= 7 ? d : ''
}

export const emailKey = (e: string): string => e.trim().toLowerCase()

/** @handle or an instagram.com link -> the bare handle. */
export function cleanInstagram(v: string): string {
  return v
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
}

// ---------- form <-> row ----------

const PHONE_OK = /^\+?[\d\s\-().]{6,30}$/

/** The first problem in plain English, or null when the contact can be saved. */
export function validateContact(i: ContactInput): string | null {
  if (!i.name.trim()) return 'Add a name.'
  if (i.name.trim().length > 200) return 'The name is too long.'
  for (const p of [...i.phones, i.whatsapp].map((x) => x.trim()).filter(Boolean)) {
    if (!PHONE_OK.test(p) || phoneKey(p) === '') return `"${p}" is not a phone number. Use digits, for example 077 123 4567.`
  }
  if (i.phones.map((p) => p.trim()).filter(Boolean).length > 10) return 'At most 10 phone numbers.'
  for (const e of i.emails.map((x) => x.trim()).filter(Boolean)) {
    if (!isPlainEmail(e)) return `"${e}" is not a plain email address.`
  }
  const ig = cleanInstagram(i.instagram)
  if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) return 'The Instagram name can only have letters, numbers, dots and underscores.'
  if (i.notes.length > 10000) return 'The notes are too long.'
  return null
}

const nul = (s: string): string | null => s.trim() || null

function uniqueBy(list: string[], key: (s: string) => string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    const v = raw.trim()
    const k = key(v)
    if (!v || seen.has(k)) continue
    seen.add(k)
    out.push(v)
  }
  return out
}

/** Columns for the contacts table. Blanks become null; numbers and emails are de-duplicated. */
export function toContactRow(i: ContactInput) {
  return {
    name: i.name.trim(),
    types: [...new Set(i.types)],
    phones: uniqueBy(i.phones, (p) => phoneKey(p) || p),
    whatsapp: nul(i.whatsapp),
    emails: uniqueBy(i.emails.map(emailKey), (e) => e),
    organisation: nul(i.organisation),
    city: nul(i.city),
    instagram: nul(cleanInstagram(i.instagram)),
    language: nul(i.language),
    owner_id: i.owner_id,
    notes: nul(i.notes),
  }
}

export function toContactInput(c: Contact): ContactInput {
  return {
    name: c.name,
    types: [...c.types],
    phones: c.phones.length ? [...c.phones] : [''],
    whatsapp: c.whatsapp ?? '',
    emails: c.emails.length ? [...c.emails] : [''],
    organisation: c.organisation ?? '',
    city: c.city ?? '',
    instagram: c.instagram ?? '',
    language: c.language ?? '',
    owner_id: c.owner_id,
    notes: c.notes ?? '',
  }
}

/** The number to call or message first: the WhatsApp one when there is one. */
export function bestPhone(c: Pick<Contact, 'whatsapp' | 'phones'>): string | null {
  return c.whatsapp?.trim() || c.phones[0]?.trim() || null
}

// ---------- duplicates ----------

interface Identity {
  name: string
  phones: string[]
  emails: string[]
}

function identityKeys(c: Identity): string[] {
  return [
    ...(normName(c.name) ? [`n:${normName(c.name)}`] : []),
    ...c.phones.map(phoneKey).filter(Boolean).map((k) => `p:${k}`),
    ...c.emails.map(emailKey).filter(Boolean).map((k) => `e:${k}`),
  ]
}

/** Active contacts that share a phone, an email or the exact name with this one. */
export function findDuplicates(candidate: Identity, list: Contact[], exceptId?: string): Contact[] {
  const mine = new Set(identityKeys(candidate))
  return list.filter((c) => !c.deleted_at && c.id !== exceptId && identityKeys(c).some((k) => mine.has(k)))
}

/** Groups of two or more active contacts linked, directly or through others, by a shared name / phone / email. */
export function duplicateGroups(list: Contact[]): Contact[][] {
  const active = list.filter((c) => !c.deleted_at)
  const parent = new Map(active.map((c) => [c.id, c.id]))
  const find = (x: string): string => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!)
      x = parent.get(x)!
    }
    return x
  }
  const owner = new Map<string, string>()
  for (const c of active)
    for (const k of identityKeys(c)) {
      const o = owner.get(k)
      if (o === undefined) owner.set(k, c.id)
      else parent.set(find(c.id), find(o))
    }
  const groups = new Map<string, Contact[]>()
  for (const c of active) groups.set(find(c.id), [...(groups.get(find(c.id)) ?? []), c])
  return [...groups.values()].filter((g) => g.length > 1)
}

// ---------- stage ----------

export function daysBetween(fromIso: string, toIso: string): number {
  const ms = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((ms(toIso) - ms(fromIso)) / 86_400_000)
}

/** The latest date we know of for this contact: last booking, newest note, or newest change to one of their inquiries. */
function lastSignal(c: Contact, s: ContactStats | undefined): string {
  const dates = [s?.last_booked_date, s?.last_note_at?.slice(0, 10), s?.last_inquiry_touch?.slice(0, 10)].filter((x): x is string => !!x)
  return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : c.created_at.slice(0, 10)
}

/** Lead (no booking yet), Active (upcoming booking), Past (booked before, still in touch) or Dormant (quiet for over 90 days). */
export function contactStage(c: Contact, s: ContactStats | undefined, today: string): Stage {
  if (s?.next_booked_date) return 'active'
  if (daysBetween(lastSignal(c, s), today) > DORMANT_DAYS) return 'dormant'
  return (s?.booked_count ?? 0) > 0 ? 'past' : 'lead'
}

/** People who booked before and have gone quiet. `ownerId` limits it to one salesperson's contacts; null = everyone's. */
export function quietContacts(list: Contact[], stats: ReadonlyMap<string, ContactStats>, today: string, ownerId: string | null): Contact[] {
  return list
    .filter((c) => !c.deleted_at && (ownerId === null || c.owner_id === ownerId) && (stats.get(c.id)?.booked_count ?? 0) > 0)
    .filter((c) => contactStage(c, stats.get(c.id), today) === 'dormant')
    .sort((a, b) => (lastSignal(b, stats.get(b.id)) > lastSignal(a, stats.get(a.id)) ? 1 : -1))
}

// ---------- search and filters ----------

const looksLikePhone = (q: string) => /^[+\d][\d\s\-()+.]*$/.test(q.trim()) && q.replace(/\D/g, '').length >= 3

/** Every word must match name, organisation, city, handle or an email; a typed number matches any spelling of a phone. */
export function searchContacts(list: Contact[], query: string): Contact[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  if (looksLikePhone(q)) {
    const want = phoneDigits(q)
    return list.filter((c) => [...c.phones, c.whatsapp ?? ''].some((p) => phoneDigits(p).includes(want)))
  }
  const words = q.split(/\s+/)
  return list.filter((c) => {
    const hay = [c.name, c.organisation, c.city, c.instagram, ...c.emails].filter(Boolean).join(' ').toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

export interface ContactFilter {
  q: string
  type: ContactType | ''
  ownerId: string
  stage: Stage | ''
  stats: ReadonlyMap<string, ContactStats>
  today: string
}

export function filterContacts(list: Contact[], f: ContactFilter): Contact[] {
  return searchContacts(list.filter((c) => !c.deleted_at), f.q).filter(
    (c) =>
      (!f.type || c.types.includes(f.type)) &&
      (!f.ownerId || c.owner_id === f.ownerId) &&
      (!f.stage || contactStage(c, f.stats.get(c.id), f.today) === f.stage),
  )
}

// ---------- money (only what the viewer can see) ----------

/** Fee of every booked / deposit-paid event whose money this viewer can read, per currency. Others are simply absent. */
export function lifetimeValue(inquiries: Inquiry[]): Partial<Record<'LKR' | 'USD', number>> {
  const out: Partial<Record<'LKR' | 'USD', number>> = {}
  for (const i of inquiries) {
    if ((i.status !== 'booking_confirmed' && i.status !== 'deposit_paid') || !i.money || i.money.fee == null) continue
    out[i.money.currency] = (out[i.money.currency] ?? 0) + i.money.fee
  }
  return out
}

export interface PendingPayment {
  inquiry: Inquiry
  /** The balance still owed, or null when this viewer cannot see money (they only get the flag). */
  amount: number | null
  currency: 'LKR' | 'USD'
  overdue: boolean
}

const addDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/**
 * Booked shows in the next `withinDays` days with money still to come, plus shows that already happened with a balance owed.
 * Amounts appear only where the viewer's money is visible; otherwise a booked show with no deposit yet is a plain flag.
 */
export function pendingPayments(list: Inquiry[], today: string, withinDays = 30): PendingPayment[] {
  const end = addDays(today, withinDays)
  const rows: PendingPayment[] = []
  for (const i of list) {
    if ((i.status !== 'booking_confirmed' && i.status !== 'deposit_paid') || !i.event_date) continue
    const past = i.event_date < today
    if (!past && i.event_date > end) continue
    const owed = i.money?.balance ?? 0
    if (i.money) {
      if (owed > 0) rows.push({ inquiry: i, amount: owed, currency: i.money.currency, overdue: past })
    } else if (!past && i.status === 'booking_confirmed') {
      rows.push({ inquiry: i, amount: null, currency: 'LKR', overdue: false })
    }
  }
  return rows.sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.inquiry.event_date!.localeCompare(b.inquiry.event_date!))
}

// ---------- reminders ----------

export type ReminderBucket = 'overdue' | 'today' | 'later' | 'done'

/** A reminder's due date is stored at midday UTC of the chosen day, so the first ten characters are the day. */
export function reminderBucket(r: Reminder, today: string): ReminderBucket {
  if (r.done) return 'done'
  const day = r.due_at.slice(0, 10)
  return day < today ? 'overdue' : day === today ? 'today' : 'later'
}

export const dueAtFor = (day: string): string => `${day}T12:00:00Z`

// ---------- WhatsApp templates ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function formatDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export interface TemplateVars {
  name?: string | null
  date?: string | null
  venue?: string | null
  event?: string | null
  me?: string | null
}

/** Fills {name} {date} {venue} {event} {me}. Missing values read naturally instead of leaving braces in a message. */
export function fillTemplate(body: string, v: TemplateVars): string {
  const map: Record<string, string> = {
    name: v.name?.trim() || 'there',
    date: v.date ? formatDay(v.date) : 'the date',
    venue: v.venue?.trim() || 'the venue',
    event: v.event?.trim() || 'the event',
    me: v.me?.trim() || '',
  }
  return body.replace(/\{(name|date|venue|event|me)\}/g, (_, k: string) => map[k])
}

// ---------- Add Event shortcuts ----------

/** The contact's bookings, newest event first (undated last). */
export function bookingsOf(contactId: string, list: Inquiry[]): Inquiry[] {
  return list
    .filter((i) => i.contact_id === contactId)
    .sort((a, b) => (b.event_date ?? '').localeCompare(a.event_date ?? '') || b.created_at.localeCompare(a.created_at))
}

/** What to pre-fill in Add Event once a contact is picked: their city and the lineup they booked last time. */
export function defaultsFromContact(c: Contact, list: Inquiry[]): { city: string; artists: string[]; venue: string } {
  const last = bookingsOf(c.id, list).find((i) => i.status !== 'lost' && i.status !== 'spam')
  return { city: c.city ?? last?.city ?? '', artists: last ? [...last.artists] : [], venue: last?.venue ?? '' }
}

export const addDaysISO = addDays

const FIELD_LABEL: Record<string, string> = {
  name: 'name', types: 'type', phones: 'phone numbers', whatsapp: 'WhatsApp number', emails: 'emails', organisation: 'organisation',
  city: 'city', instagram: 'Instagram', language: 'language', owner_id: 'owner', notes: 'notes',
}

/** One plain-English line for a row of a contact's change history. */
export function describeContactHistory(r: ContactHistoryRow): string {
  switch (r.kind) {
    case 'created':
      return 'Contact created'
    case 'edited': {
      const fields = Object.keys(r.data).map((k) => FIELD_LABEL[k] ?? k)
      return fields.length ? `Changed ${fields.join(', ')}` : 'Edited'
    }
    case 'deleted':
      return 'Moved to Trash'
    case 'restored':
      return 'Restored from Trash'
    case 'merged': {
      const n = Array.isArray(r.data.merged) ? r.data.merged.length : 0
      return `Merged ${n} ${n === 1 ? 'contact' : 'contacts'} into this one${r.data.undone ? ' (undone)' : ''}`
    }
    case 'merged_away':
      return 'Merged into another contact'
    case 'merge_undone':
      return 'A merge was undone'
    default:
      return r.kind
  }
}

/** "3 days ago" / "today" / "in 2 days" for a YYYY-MM-DD or ISO timestamp, against today's YYYY-MM-DD. */
export function ago(iso: string | null | undefined, today: string): string {
  if (!iso) return ''
  const days = daysBetween(iso, today)
  if (days <= 0) return days === 0 ? 'today' : `in ${-days} day${days === -1 ? '' : 's'}`
  if (days === 1) return 'yesterday'
  if (days < 60) return `${days} days ago`
  return `${Math.round(days / 30)} months ago`
}

/** The booking a message to this contact is most likely about: their soonest upcoming one, else their latest. */
export function contextBooking(contactId: string, list: Inquiry[], today: string): Inquiry | undefined {
  const mine = bookingsOf(contactId, list).filter((i) => i.status !== 'lost' && i.status !== 'spam')
  const upcoming = mine.filter((i) => i.event_date && i.event_date >= today).sort((a, b) => a.event_date!.localeCompare(b.event_date!))[0]
  return upcoming ?? mine[0]
}
