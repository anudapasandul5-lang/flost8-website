import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChatCircle, EnvelopeSimple, Phone, X } from '@phosphor-icons/react'
import { isPlainEmail } from '../../lib/manage/access'
import { friendlyError } from '../../lib/manage/api'
import { formatDate } from '../../lib/manage/calendar'
import {
  addContactNote, addReminder, deleteContactNote, fetchContactHistory, fetchContactNotes, fetchContactReminders, setContactDeleted,
  setReminderDone, undoMerge,
} from '../../lib/manage/contactsApi'
import {
  ago, bestPhone, bookingsOf, contactStage, describeContactHistory, lifetimeValue, NOTE_LABEL, reminderBucket,
  type Contact, type ContactStats, type NoteKind,
} from '../../lib/manage/contacts'
import { useLoad } from '../../lib/manage/hooks'
import { inquiryTitle } from '../../lib/manage/labels'
import { formatAmount } from '../../lib/manage/money'
import type { Artist, Inquiry, Manager } from '../../lib/manage/types'
import { StageBadge, TypeTags } from './contactUi'
import RemindPicker from './RemindPicker'
import { BTN_GHOST, BTN_PRIMARY, CHIP_BASE, CHIP_OFF, CHIP_ON, FOCUS_RING, INPUT, LABEL, PANEL } from './styles'
import { ConfirmDialog, ErrorPanel, StatusBadge, type ToastMsg } from './ui'
import { useLockScroll } from './useLockScroll'

const when = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

function Row({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === '' || children === false) return null
  return (
    <div className="min-w-0">
      <dt className="font-grotesk text-[13px] text-[var(--ink-50)]">{label}</dt>
      <dd className="break-words font-grotesk text-[1rem] text-ink">{children}</dd>
    </div>
  )
}

const KINDS: NoteKind[] = ['call', 'whatsapp', 'note', 'meeting', 'email']

/** The contact card: details, every booking, a notes and call log, follow-up reminders and the change history. */
export default function ContactDrawer({
  contact,
  me,
  managers,
  stats,
  inquiries,
  artists,
  today,
  onClose,
  onChanged,
  onEdit,
  onMerge,
  onOpenInquiry,
  onWhatsApp,
  notify,
}: {
  contact: Contact
  me: Manager
  managers: Manager[]
  stats: ReadonlyMap<string, ContactStats>
  inquiries: Inquiry[]
  artists: Artist[]
  today: string
  onClose: () => void
  /** Called after anything changed, so the lists behind the drawer re-read. */
  onChanged: () => void
  onEdit: () => void
  onMerge: () => void
  onOpenInquiry: (id: string) => void
  onWhatsApp: () => void
  notify: (t: ToastMsg) => void
}) {
  const reduce = useReducedMotion()
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [kind, setKind] = useState<NoteKind>('call')
  const [body, setBody] = useState('')
  const [remind, setRemind] = useState('')
  const [rNote, setRNote] = useState('')
  const [rDay, setRDay] = useState('')

  useLockScroll(true)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !askDelete && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, askDelete])

  const bump = useCallback(() => {
    setVersion((v) => v + 1)
    onChanged()
  }, [onChanged])

  const notes = useLoad(useCallback(() => fetchContactNotes(contact.id).then((rows) => ({ rows, version })), [contact.id, version]))
  const reminders = useLoad(useCallback(() => fetchContactReminders(contact.id).then((rows) => ({ rows, version })), [contact.id, version]))
  const history = useLoad(useCallback(() => (showHistory ? fetchContactHistory(contact.id).then((rows) => ({ rows, version })) : Promise.resolve({ rows: [], version })), [contact.id, showHistory, version]))

  const s = stats.get(contact.id)
  const stage = contactStage(contact, s, today)
  const bookings = useMemo(() => bookingsOf(contact.id, inquiries), [contact.id, inquiries])
  const value = lifetimeValue(bookings)
  const valueText = (Object.entries(value) as ['LKR' | 'USD', number][]).map(([cur, n]) => formatAmount(n, cur)).join(' + ')
  const ownerName = managers.find((m) => m.id === contact.owner_id)?.name
  const who = (id: string | null) => (id ? managers.find((m) => m.id === id)?.name ?? 'Someone' : 'System')
  const phone = bestPhone(contact)
  const email = contact.emails.find(isPlainEmail)
  const deleted = !!contact.deleted_at

  async function run(fn: () => Promise<void>, ok?: string) {
    setBusy(true)
    try {
      await fn()
      if (ok) notify({ kind: 'ok', text: ok })
      bump()
    } catch (err) {
      notify({ kind: 'error', text: friendlyError(err) })
    } finally {
      setBusy(false)
    }
  }

  const logNote = () =>
    run(async () => {
      const text = body.trim()
      if (!text) throw new Error('empty')
      await addContactNote(contact.id, me.id, kind, text)
      if (remind) await addReminder({ contactId: contact.id, managerId: me.id, day: remind, note: text.slice(0, 120) })
      setBody('')
      setRemind('')
    }, remind ? 'Logged, and reminder set' : 'Logged')

  const addStandalone = () =>
    run(async () => {
      if (!rDay) throw new Error('empty')
      await addReminder({ contactId: contact.id, managerId: me.id, day: rDay, note: rNote })
      setRNote('')
      setRDay('')
    }, 'Reminder set')

  const openReminders = reminders.state.status === 'ok' ? reminders.state.data.rows.filter((r) => !r.done) : []

  return (
    <>
    <div className="fixed inset-0 z-[70] bg-black/60" onClick={onClose}>
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={contact.name}
        data-lenis-prevent
        initial={reduce ? false : { x: 48, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 flex w-full flex-col overflow-y-auto overscroll-contain bg-base shadow-[-12px_0_40px_rgba(10,4,14,0.6)] md:max-w-[620px] md:border-l md:border-[var(--bg-line)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--bg-line)] bg-base px-4 py-4 md:px-6">
          <div className="min-w-0">
            <h2 className="break-words font-display text-3xl leading-tight text-ink md:text-4xl">{contact.name}</h2>
            <p className="mt-1 font-grotesk text-sm text-[var(--ink-72)]">{[contact.organisation, contact.city].filter(Boolean).join(', ') || 'No organisation yet'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {deleted ? <span className="rounded-full bg-[rgba(252,165,165,0.12)] px-3 py-1 font-grotesk text-[13px] font-medium text-[#FCA5A5]">In Trash</span> : <StageBadge stage={stage} />}
              <TypeTags types={contact.types} />
            </div>
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label="Close" className={`${BTN_GHOST} !h-11 !w-11 !min-h-0 shrink-0 !p-0`}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6 px-4 py-6 md:px-6">
          {deleted && (
            <div role="note" className={`${PANEL} border-[#7a2f3a] p-4 font-grotesk text-[15px] text-ink`}>
              <p>This contact is in Trash. Their bookings and notes are still attached. Restore it to use it again.</p>
              <button type="button" disabled={busy} onClick={() => void run(() => setContactDeleted(contact.id, false, me.id), 'Restored')} className={`${BTN_PRIMARY} mt-3 w-full`}>
                Restore contact
              </button>
            </div>
          )}

          {!deleted && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" onClick={onWhatsApp} className={`${BTN_PRIMARY} !px-3`}>
                <ChatCircle size={18} weight="fill" aria-hidden="true" />
                WhatsApp
              </button>
              {phone ? (
                <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={`${BTN_GHOST} !min-h-[48px]`}>
                  <Phone size={18} aria-hidden="true" />
                  Call
                </a>
              ) : (
                <span aria-disabled="true" className={`${BTN_GHOST} !min-h-[48px] opacity-50`}>Call</span>
              )}
              {email ? (
                <a href={`mailto:${email}`} className={`${BTN_GHOST} !min-h-[48px]`}>
                  <EnvelopeSimple size={18} aria-hidden="true" />
                  Email
                </a>
              ) : (
                <span aria-disabled="true" className={`${BTN_GHOST} !min-h-[48px] opacity-50`}>Email</span>
              )}
              <button type="button" onClick={onEdit} className={`${BTN_GHOST} !min-h-[48px] border-[var(--accent-line)] text-ink`}>
                Edit
              </button>
            </div>
          )}

          <section aria-label="Details">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Row label="Phone">{contact.phones.length > 0 && contact.phones.map((p) => <a key={p} href={`tel:${p.replace(/[^\d+]/g, '')}`} className="mr-3 inline-block underline">{p}</a>)}</Row>
              <Row label="WhatsApp">{contact.whatsapp}</Row>
              <Row label="Email">{contact.emails.length > 0 && contact.emails.map((e) => (isPlainEmail(e) ? <a key={e} href={`mailto:${e}`} className="mr-3 inline-block underline">{e}</a> : <span key={e} className="mr-3">{e}</span>))}</Row>
              <Row label="Instagram">{contact.instagram && <a href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noreferrer noopener" className="underline">@{contact.instagram}</a>}</Row>
              <Row label="Language">{contact.language}</Row>
              <Row label="Owner">{ownerName ?? 'Nobody yet'}</Row>
              <Row label="Last booked">{s?.last_booked_date ? `${formatDate(s.last_booked_date)} (${ago(s.last_booked_date, today)})` : null}</Row>
              <Row label="Next booking">{s?.next_booked_date ? formatDate(s.next_booked_date) : null}</Row>
              <Row label="Lifetime value you can see">{valueText}</Row>
            </dl>
            {contact.notes && <p className="mt-4 whitespace-pre-wrap rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] p-4 font-grotesk text-[15px] text-ink">{contact.notes}</p>}
          </section>

          {!deleted && (
            <section aria-label="Reminders">
              <h3 className="mb-3 font-display text-2xl text-ink">FOLLOW-UPS</h3>
              {reminders.state.status === 'error' && <ErrorPanel message={reminders.state.message} onRetry={reminders.retry} />}
              {openReminders.length > 0 && (
                <ul className="mb-4 space-y-2">
                  {openReminders.map((r) => {
                    const b = reminderBucket(r, today)
                    return (
                      <li key={r.id} className={`${PANEL} flex items-center justify-between gap-3 p-3`}>
                        <div className="min-w-0 font-grotesk">
                          <p className={`text-[14px] font-medium ${b === 'overdue' ? 'text-[#FF6B6B]' : b === 'today' ? 'text-[#FCD34D]' : 'text-[var(--ink-72)]'}`}>
                            {b === 'overdue' ? 'Overdue, ' : b === 'today' ? 'Today, ' : ''}
                            {formatDate(r.due_at.slice(0, 10))}
                            {r.manager_id !== me.id ? ` (${who(r.manager_id)})` : ''}
                          </p>
                          {r.note && <p className="break-words text-[15px] text-ink">{r.note}</p>}
                        </div>
                        <button type="button" disabled={busy} onClick={() => void run(() => setReminderDone(r.id, true), 'Marked done')} className={`${BTN_GHOST} shrink-0`}>
                          Done
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="space-y-3">
                <RemindPicker today={today} value={rDay} onChange={setRDay} idPrefix="cd-rem" legend="Add a reminder" allowNone={false} />
                {rDay && (
                  <>
                    <div>
                      <label htmlFor="cd-rem-note" className={LABEL}>What to follow up on</label>
                      <input id="cd-rem-note" autoComplete="off" maxLength={1000} value={rNote} onChange={(e) => setRNote(e.target.value)} placeholder="Chase the deposit" className={INPUT} />
                    </div>
                    <button type="button" disabled={busy} onClick={() => void addStandalone()} className={`${BTN_PRIMARY} w-full`}>
                      Set reminder
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          <section aria-label="Bookings">
            <h3 className="mb-3 font-display text-2xl text-ink">BOOKINGS</h3>
            {bookings.length === 0 ? (
              <p className="font-grotesk text-[15px] text-[var(--ink-72)]">
                {s && s.any_count > 0 ? `${s.any_count} booking(s) belong to other managers' artists, so only they can open them.` : 'No bookings linked yet. Pick this contact when you add an event.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {bookings.map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => onOpenInquiry(i.id)} className={`${PANEL} flex min-h-[56px] w-full items-center justify-between gap-3 p-3 text-left ${FOCUS_RING}`}>
                      <span className="min-w-0 font-grotesk">
                        <span className="block truncate text-[1rem] text-ink">{inquiryTitle(i)}</span>
                        <span className="block text-[13px] text-[var(--ink-50)]">
                          {formatDate(i.event_date)}
                          {i.artists.length ? `, ${i.artists.map((a) => artists.find((x) => x.slug === a)?.name ?? a).join(' + ')}` : ''}
                        </span>
                      </span>
                      <StatusBadge status={i.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!deleted && (
            <section aria-label="Log">
              <h3 className="mb-3 font-display text-2xl text-ink">LOG A TOUCH</h3>
              <div className="space-y-3">
                <div role="group" aria-label="What happened" className="flex flex-wrap gap-2">
                  {KINDS.map((k) => (
                    <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`${CHIP_BASE} ${kind === k ? CHIP_ON : CHIP_OFF}`}>
                      {NOTE_LABEL[k]}
                    </button>
                  ))}
                </div>
                <div>
                  <label htmlFor="cd-note" className={LABEL}>What was said</label>
                  <textarea id="cd-note" rows={3} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Called, will confirm Friday" className={`${INPUT} resize-y`} />
                </div>
                <RemindPicker today={today} value={remind} onChange={setRemind} idPrefix="cd-log" />
                <button type="button" disabled={busy || !body.trim()} onClick={() => void logNote()} className={`${BTN_PRIMARY} w-full`}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </section>
          )}

          <section aria-label="Timeline">
            <h3 className="mb-3 font-display text-2xl text-ink">TIMELINE</h3>
            {notes.state.status === 'loading' && <div className="h-16 animate-pulse rounded-2xl bg-[var(--bg-raise)]" aria-busy="true" />}
            {notes.state.status === 'error' && <ErrorPanel message={notes.state.message} onRetry={notes.retry} />}
            {notes.state.status === 'ok' &&
              (notes.state.data.rows.length === 0 ? (
                <p className="font-grotesk text-sm text-[var(--ink-50)]">Nothing logged yet.</p>
              ) : (
                <ol className="space-y-3">
                  {notes.state.data.rows.map((n) => (
                    <li key={n.id} className="border-l-2 border-[var(--bg-line)] pl-4">
                      <p className="flex items-center justify-between gap-2 font-grotesk text-[12px] text-[var(--ink-50)]">
                        <span>
                          {NOTE_LABEL[n.kind]} by {who(n.author_id)}, {when(n.created_at)}
                        </span>
                        {(n.author_id === me.id || me.role === 'owner') && (
                          <button type="button" onClick={() => void run(() => deleteContactNote(n.id), 'Deleted')} className="min-h-[44px] px-2 underline">
                            Delete
                          </button>
                        )}
                      </p>
                      <p className="whitespace-pre-wrap break-words font-grotesk text-[15px] text-ink">{n.body}</p>
                    </li>
                  ))}
                </ol>
              ))}
          </section>

          <section aria-label="History">
            <button type="button" aria-expanded={showHistory} onClick={() => setShowHistory((v) => !v)} className={BTN_GHOST}>
              {showHistory ? 'Hide change history' : 'Show change history'}
            </button>
            {showHistory && (
              <div className="mt-3">
                {history.state.status === 'loading' && <div className="h-16 animate-pulse rounded-2xl bg-[var(--bg-raise)]" aria-busy="true" />}
                {history.state.status === 'error' && <ErrorPanel message={history.state.message} onRetry={history.retry} />}
                {history.state.status === 'ok' && (
                  <ol className="space-y-3">
                    {history.state.data.rows.map((h) => (
                      <li key={h.id} className="border-l-2 border-[var(--bg-line)] pl-4">
                        <p className="font-grotesk text-[12px] text-[var(--ink-50)]">
                          {who(h.actor_id)}, {when(h.created_at)}
                        </p>
                        <p className="font-grotesk text-[15px] text-[var(--ink-72)]">{describeContactHistory(h)}</p>
                        {h.kind === 'merged' && !h.data.undone && (
                          <button type="button" disabled={busy} onClick={() => void run(() => undoMerge(h.id), 'Merge undone')} className={`${BTN_GHOST} mt-2`}>
                            Undo this merge
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </section>

          {!deleted && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--bg-line)] pt-5">
              <button type="button" onClick={onMerge} className={BTN_GHOST}>
                Merge with another contact
              </button>
              <button type="button" onClick={() => setAskDelete(true)} disabled={busy} className={`${BTN_GHOST} text-[#FCA5A5]`}>
                Move to Trash
              </button>
            </div>
          )}
        </div>
      </motion.aside>
    </div>

      {askDelete && (
        <ConfirmDialog
          title="MOVE TO TRASH?"
          body={`${contact.name} goes to Trash for 30 days and can be restored. Their bookings, notes and reminders stay attached.`}
          confirmLabel="Move to Trash"
          onCancel={() => setAskDelete(false)}
          onConfirm={() => {
            setAskDelete(false)
            void run(async () => {
              await setContactDeleted(contact.id, true, me.id)
              onClose()
            }, 'Moved to Trash')
          }}
        />
      )}
    </>
  )
}
