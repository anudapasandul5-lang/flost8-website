import { getSupabase } from './supabase'
import { isRlsError, newId, NotAllowedError } from './api'
import {
  dueAtFor, toContactRow, type Contact, type ContactHistoryRow, type ContactInput, type ContactNote, type ContactStats, type MessageTemplate,
  type NoteKind, type Reminder,
} from './contacts'

/** Turns the database's "no" into the same plain message the rest of /manage uses. */
function check(error: { code?: string; message?: string } | null): void {
  if (!error) return
  if (isRlsError(error) || error.code === '42501') throw new NotAllowedError()
  throw error
}

const CONTACT_COLUMNS =
  'id,name,types,phones,whatsapp,emails,organisation,city,instagram,language,owner_id,notes,created_by,created_at,updated_at,deleted_at,deleted_by,merged_into'

const CONTACT_PAGE = 1000

/** Every contact, deleted ones included: the Trash view and the restore button read them. */
export async function fetchContacts(): Promise<Contact[]> {
  // PostgREST caps one response (1000 rows by default), whatever .limit() says, so read page by page until a short page.
  const all: Contact[] = []
  for (let from = 0; ; from += CONTACT_PAGE) {
    const { data, error } = await getSupabase().from('contacts').select(CONTACT_COLUMNS).order('name').order('id').range(from, from + CONTACT_PAGE - 1)
    check(error)
    all.push(...(data as Contact[]))
    if (!data || data.length < CONTACT_PAGE) return all
  }
}

/** One row per contact. The same 1000-row response cap applies to rpc results, so this is paged like fetchContacts. */
export async function fetchContactStats(today: string): Promise<Map<string, ContactStats>> {
  const out = new Map<string, ContactStats>()
  for (let from = 0; ; from += CONTACT_PAGE) {
    const { data, error } = await getSupabase().rpc('contact_stats', { p_today: today }).order('contact_id').range(from, from + CONTACT_PAGE - 1)
    check(error)
    for (const s of (data ?? []) as ContactStats[]) out.set(s.contact_id, s)
    if (!data || data.length < CONTACT_PAGE) return out
  }
}

/** The id is made here so a retry after a dropped connection cannot create a second contact. */
export async function createContact(input: ContactInput, id: string = newId()): Promise<Contact> {
  const sb = getSupabase()
  const made = await sb.from('contacts').insert({ id, ...toContactRow(input) })
  if (made.error && made.error.code !== '23505') check(made.error)
  const { data, error } = await sb.from('contacts').select(CONTACT_COLUMNS).eq('id', id).single()
  check(error)
  return data as Contact
}

export async function updateContact(id: string, input: ContactInput): Promise<void> {
  const { data, error } = await getSupabase().from('contacts').update(toContactRow(input)).eq('id', id).select('id')
  check(error)
  if (!data || data.length === 0) throw new NotAllowedError()
}

/** Soft delete / restore. Nothing is erased: Trash keeps it for 30 days. */
export async function setContactDeleted(id: string, deleted: boolean, meId: string): Promise<void> {
  const patch = deleted ? { deleted_at: new Date().toISOString(), deleted_by: meId } : { deleted_at: null, deleted_by: null }
  const { data, error } = await getSupabase().from('contacts').update(patch).eq('id', id).select('id')
  check(error)
  if (!data || data.length === 0) throw new NotAllowedError()
}

export interface MergeFields {
  name?: string
  whatsapp?: string
  organisation?: string
  city?: string
  instagram?: string
  language?: string
  owner_id?: string
}

export async function mergeContacts(keepId: string, mergeIds: string[], fields: MergeFields = {}): Promise<void> {
  check((await getSupabase().rpc('merge_contacts', { p_keep: keepId, p_merge: mergeIds, p_fields: fields })).error)
}

export async function undoMerge(historyId: number): Promise<void> {
  check((await getSupabase().rpc('undo_merge', { p_history: historyId })).error)
}

export async function fetchContactHistory(contactId: string): Promise<ContactHistoryRow[]> {
  const { data, error } = await getSupabase()
    .from('contact_history')
    .select('id,contact_id,actor_id,kind,data,created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(200)
  check(error)
  return data as ContactHistoryRow[]
}

export async function fetchContactNotes(contactId: string): Promise<ContactNote[]> {
  const { data, error } = await getSupabase()
    .from('contact_notes')
    .select('id,contact_id,author_id,kind,body,inquiry_id,created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(500)
  check(error)
  return data as ContactNote[]
}

export async function addContactNote(contactId: string, authorId: string, kind: NoteKind, body: string, inquiryId: string | null = null): Promise<void> {
  check((await getSupabase().from('contact_notes').insert({ contact_id: contactId, author_id: authorId, kind, body: body.trim(), inquiry_id: inquiryId })).error)
}

export async function deleteContactNote(id: string): Promise<void> {
  check((await getSupabase().from('contact_notes').delete().eq('id', id)).error)
}

// ---------- reminders ----------

const REMINDER_COLUMNS = 'id,inquiry_id,contact_id,manager_id,due_at,note,done,done_at,created_at'

/** Open reminders this person may see (their own; the owner role sees everyone's), soonest first. */
export async function fetchOpenReminders(): Promise<Reminder[]> {
  const { data, error } = await getSupabase().from('reminders').select(REMINDER_COLUMNS).eq('done', false).order('due_at').limit(1000)
  check(error)
  return data as Reminder[]
}

export async function fetchContactReminders(contactId: string): Promise<Reminder[]> {
  const { data, error } = await getSupabase().from('reminders').select(REMINDER_COLUMNS).eq('contact_id', contactId).order('due_at', { ascending: false }).limit(100)
  check(error)
  return data as Reminder[]
}

export async function addReminder(r: { contactId: string; managerId: string; day: string; note: string }): Promise<void> {
  check((await getSupabase().from('reminders').insert({ contact_id: r.contactId, manager_id: r.managerId, due_at: dueAtFor(r.day), note: r.note.trim() || null })).error)
}

export async function setReminderDone(id: string, done: boolean): Promise<void> {
  const { data, error } = await getSupabase().from('reminders').update({ done, done_at: done ? new Date().toISOString() : null }).eq('id', id).select('id')
  check(error)
  if (!data || data.length === 0) throw new NotAllowedError()
}

// ---------- WhatsApp templates ----------

export async function fetchTemplates(): Promise<MessageTemplate[]> {
  const { data, error } = await getSupabase().from('message_templates').select('id,title,language,body,archived').order('title')
  check(error)
  return data as MessageTemplate[]
}

export async function saveTemplate(t: { id?: string; title: string; language: string; body: string }): Promise<void> {
  const row = { title: t.title.trim(), language: t.language.trim() || 'English', body: t.body.trim() }
  const sb = getSupabase()
  check((t.id ? await sb.from('message_templates').update(row).eq('id', t.id) : await sb.from('message_templates').insert(row)).error)
}

export async function setTemplateArchived(id: string, archived: boolean): Promise<void> {
  check((await getSupabase().from('message_templates').update({ archived }).eq('id', id)).error)
}

// ---------- links on inquiries ----------

export async function setInquiryContact(inquiryId: string, contactId: string | null): Promise<void> {
  check((await getSupabase().rpc('set_inquiry_contact', { p_inquiry: inquiryId, p_contact: contactId })).error)
}

/** Owner only. true = keep this event off the public Shows list; false = release it. */
export async function setPublishHold(inquiryId: string, hold: boolean): Promise<void> {
  check((await getSupabase().rpc('set_inquiry_publish_hold', { p_inquiry: inquiryId, p_hold: hold })).error)
}
