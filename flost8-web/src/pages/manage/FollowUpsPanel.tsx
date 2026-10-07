import { useState } from 'react'
import { ChatCircle, Check } from '@phosphor-icons/react'
import { friendlyError } from '../../lib/manage/api'
import { setReminderDone } from '../../lib/manage/contactsApi'
import { formatDate } from '../../lib/manage/calendar'
import { bestPhone, reminderBucket, type Contact, type Reminder } from '../../lib/manage/contacts'
import type { Manager } from '../../lib/manage/types'
import { BTN_GHOST, FOCUS_RING, PANEL } from './styles'
import type { ToastMsg } from './ui'

/**
 * Reminders that are due today or overdue. A salesperson sees their own; the owner sees everyone's and whose each one is.
 * Renders nothing when there is nothing due, so it costs no space on a quiet day.
 */
export default function FollowUpsPanel({
  reminders,
  contacts,
  managers,
  me,
  today,
  onOpenContact,
  onWhatsApp,
  onChanged,
  notify,
  title = 'FOLLOW-UPS DUE',
}: {
  reminders: Reminder[]
  contacts: Contact[]
  managers: Manager[]
  me: Manager
  today: string
  onOpenContact: (id: string) => void
  onWhatsApp: (c: Contact) => void
  onChanged: () => void
  notify: (t: ToastMsg) => void
  title?: string
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const due = reminders
    .filter((r) => r.contact_id && ['overdue', 'today'].includes(reminderBucket(r, today)))
    .sort((a, b) => a.due_at.localeCompare(b.due_at))
  if (due.length === 0) return null

  async function done(r: Reminder) {
    setBusy(r.id)
    try {
      await setReminderDone(r.id, true)
      onChanged()
    } catch (err) {
      notify({ kind: 'error', text: friendlyError(err) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-label="Follow-ups due" className="mb-6">
      <h2 className="mb-3 font-display text-2xl text-ink">
        {title} <span className="text-[var(--ink-50)]">({due.length})</span>
      </h2>
      <ul className="space-y-2">
        {due.map((r) => {
          const c = contacts.find((x) => x.id === r.contact_id)
          if (!c) return null
          const overdue = reminderBucket(r, today) === 'overdue'
          const mine = r.manager_id === me.id
          return (
            <li key={r.id} className={`${PANEL} flex flex-wrap items-center gap-3 p-3`} style={{ borderLeft: `3px solid ${overdue ? '#FF6B6B' : '#FCD34D'}` }}>
              <button type="button" onClick={() => onOpenContact(c.id)} className={`min-w-0 flex-1 text-left font-grotesk ${FOCUS_RING}`}>
                <span className="block truncate text-[1rem] text-ink">{c.name}</span>
                <span className="block text-[13.5px] text-[var(--ink-72)]">
                  {overdue ? `Overdue since ${formatDate(r.due_at.slice(0, 10))}` : 'Due today'}
                  {!mine ? `, for ${managers.find((m) => m.id === r.manager_id)?.name ?? 'someone'}` : ''}
                </span>
                {r.note && <span className="block break-words text-[14.5px] text-ink">{r.note}</span>}
              </button>
              <div className="flex shrink-0 gap-2">
                {bestPhone(c) && (
                  <button type="button" aria-label={`WhatsApp ${c.name}`} onClick={() => onWhatsApp(c)} className={`${BTN_GHOST} !w-11 !px-0`}>
                    <ChatCircle size={20} aria-hidden="true" />
                  </button>
                )}
                <button type="button" disabled={busy === r.id} onClick={() => void done(r)} className={BTN_GHOST}>
                  <Check size={18} aria-hidden="true" />
                  Done
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
