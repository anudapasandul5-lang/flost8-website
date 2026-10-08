import { useMemo, useState } from 'react'
import { ChatCircle, MagnifyingGlass, Phone, Plus } from '@phosphor-icons/react'
import { formatDate } from '../../lib/manage/calendar'
import {
  ago, bestPhone, CONTACT_TYPES, contactStage, duplicateGroups, filterContacts, STAGE_LABEL, TYPE_LABEL,
  type Contact, type ContactStats, type ContactType, type Stage,
} from '../../lib/manage/contacts'
import { waLink } from '../../lib/manage/needsAction'
import type { Manager } from '../../lib/manage/types'
import { EmptyNote, StageBadge, TypeTags } from './contactUi'
import { ConfirmDialog } from './ui'
import { BTN_GHOST, BTN_PRIMARY, CHIP_BASE, CHIP_OFF, CHIP_ON, FOCUS_RING, INPUT } from './styles'

const STAGES: Stage[] = ['lead', 'active', 'past', 'dormant']

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** Every contact in one list: search, filter by type / stage / owner, one-tap call and WhatsApp, Trash and merge. */
export default function ContactsView({
  me,
  managers,
  contacts,
  stats,
  managerFilter,
  today,
  onOpen,
  onNew,
  onMerge,
  onTemplates,
  onWhatsApp,
  onRestore,
  onErase,
}: {
  me: Manager
  managers: Manager[]
  contacts: Contact[]
  stats: ReadonlyMap<string, ContactStats>
  /** The owner's Everyone / Kasuni / Nirbheeth chips. */
  managerFilter: string | null
  today: string
  onOpen: (id: string) => void
  onNew: () => void
  onMerge: () => void
  onTemplates: () => void
  onWhatsApp: (c: Contact) => void
  onRestore: (c: Contact) => void
  /** Owner only: erase a trashed contact for good. */
  onErase?: (c: Contact) => void
}) {
  const [q, setQ] = useState('')
  const [type, setType] = useState<ContactType | ''>('')
  const [stage, setStage] = useState<Stage | ''>('')
  const [mineOnly, setMineOnly] = useState(false)
  const [trash, setTrash] = useState(false)
  const [erasing, setErasing] = useState<Contact | null>(null)

  const ownerId = me.role === 'owner' ? (managerFilter ?? '') : mineOnly ? me.id : ''
  const shown = useMemo(() => filterContacts(contacts, { q, type, ownerId, stage, stats, today }), [contacts, q, type, ownerId, stage, stats, today])
  const dupes = useMemo(() => duplicateGroups(contacts).length, [contacts])
  const inTrash = useMemo(() => {
    return contacts.filter((c) => c.deleted_at && !c.merged_into)
  }, [contacts])
  const active = contacts.filter((c) => !c.deleted_at)
  const ownerName = (id: string | null) => managers.find((m) => m.id === id)?.name

  const chip = (on: boolean) => `${CHIP_BASE} ${on ? CHIP_ON : CHIP_OFF}`

  if (trash)
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-grotesk text-[15px] text-[var(--ink-72)]">Deleted contacts stay here until they are cleared out for good. Restore one any time.</p>
          <button type="button" onClick={() => setTrash(false)} className={BTN_GHOST}>
            Back to contacts
          </button>
        </div>
        {inTrash.length === 0 ? (
          <EmptyNote>Trash is empty.</EmptyNote>
        ) : (
          <ul className="space-y-2">
            {inTrash.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] p-3">
                <button type="button" onClick={() => onOpen(c.id)} className={`min-w-0 flex-1 text-left font-grotesk ${FOCUS_RING}`}>
                  <span className="block truncate text-[1rem] text-ink">{c.name}</span>
                  <span className="block text-[13px] text-[var(--ink-50)]">Deleted {ago(c.deleted_at, today)}</span>
                </button>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => onRestore(c)} className={BTN_GHOST}>
                    Restore
                  </button>
                  {me.role === 'owner' && onErase && (
                    <button type="button" onClick={() => setErasing(c)} className={`${BTN_GHOST} text-[#FCA5A5]`}>
                      Delete forever
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {erasing && (
          <ConfirmDialog
            title="DELETE FOR GOOD?"
            body={
              <>
                <span className="block">{erasing.name} and their notes, history and reminders will be erased. Events linked to them stay, with no contact.</span>
                <span className="mt-2 block font-medium text-ink">This cannot be undone.</span>
              </>
            }
            confirmLabel="Delete forever"
            onConfirm={() => {
              const c = erasing
              setErasing(null)
              onErase?.(c)
            }}
            onCancel={() => setErasing(null)}
          />
        )}
      </div>
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="ct-search" className="sr-only">Search contacts</label>
          <MagnifyingGlass size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-50)]" />
          <input id="ct-search" type="search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email, venue" className={`${INPUT} !pl-11`} />
        </div>
        <button type="button" onClick={onNew} className={BTN_PRIMARY}>
          <Plus size={18} weight="bold" aria-hidden="true" />
          New contact
        </button>
      </div>

      <div role="group" aria-label="Filter by type" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        <button type="button" aria-pressed={type === ''} className={chip(type === '')} onClick={() => setType('')}>
          All types
        </button>
        {CONTACT_TYPES.map((t) => (
          <button key={t} type="button" aria-pressed={type === t} className={chip(type === t)} onClick={() => setType(type === t ? '' : t)}>
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Filter by stage" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        <button type="button" aria-pressed={stage === ''} className={chip(stage === '')} onClick={() => setStage('')}>
          Any stage
        </button>
        {STAGES.map((s) => (
          <button key={s} type="button" aria-pressed={stage === s} className={chip(stage === s)} onClick={() => setStage(stage === s ? '' : s)}>
            {STAGE_LABEL[s]}
          </button>
        ))}
        {me.role !== 'owner' && (
          <button type="button" aria-pressed={mineOnly} className={chip(mineOnly)} onClick={() => setMineOnly((v) => !v)}>
            Only mine
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto font-grotesk text-sm text-[var(--ink-72)]" aria-live="polite">
          {shown.length} of {active.length} contact{active.length === 1 ? '' : 's'}
        </p>
        <button type="button" onClick={onMerge} className={BTN_GHOST}>
          Merge duplicates{dupes > 0 ? ` (${dupes})` : ''}
        </button>
        <button type="button" onClick={onTemplates} className={BTN_GHOST}>
          Message templates
        </button>
        <button type="button" onClick={() => setTrash(true)} className={BTN_GHOST}>
          Trash{inTrash.length > 0 ? ` (${inTrash.length})` : ''}
        </button>
      </div>

      {active.length === 0 ? (
        <EmptyNote>No contacts yet. Add one, or pick one when you add an event and it will build up on its own.</EmptyNote>
      ) : shown.length === 0 ? (
        <EmptyNote>
          Nobody matches that.{' '}
          <button type="button" onClick={() => { setQ(''); setType(''); setStage(''); setMineOnly(false) }} className="underline">
            Clear filters
          </button>
        </EmptyNote>
      ) : (
        <ul className="space-y-2">
          {shown.map((c) => {
            const s = stats.get(c.id)
            const st = contactStage(c, s, today)
            const phone = bestPhone(c)
            const hasWa = !!waLink(phone)
            const detail = s?.next_booked_date ? `Next: ${formatDate(s.next_booked_date)}` : s?.last_booked_date ? `Last booked ${ago(s.last_booked_date, today)}` : (s?.any_count ?? 0) > 0 ? `${s!.any_count} enquiry` : 'No bookings yet'
            return (
              <li key={c.id} className="flex items-center gap-2 rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] p-2">
                <button type="button" onClick={() => onOpen(c.id)} className={`flex min-h-[64px] min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5 ${FOCUS_RING}`}>
                  <i className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#9D14FF] to-[#3B0764] text-[14px] font-semibold not-italic text-ink" aria-hidden="true">
                    {initials(c.name)}
                  </i>
                  <span className="min-w-0 flex-1 font-grotesk">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-[1.0625rem] text-ink">{c.name}</span>
                      <StageBadge stage={st} />
                    </span>
                    <span className="block truncate text-[13.5px] text-[var(--ink-72)]">
                      {[c.organisation, c.city].filter(Boolean).join(', ') || phone || 'No details yet'}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--ink-50)]">
                      <TypeTags types={c.types} />
                      <span>{detail}</span>
                      {ownerName(c.owner_id) && me.role === 'owner' && <span>Owner: {ownerName(c.owner_id)}</span>}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                  <button type="button" aria-label={`WhatsApp ${c.name}`} disabled={!hasWa} onClick={() => onWhatsApp(c)} className={`${BTN_GHOST} !w-11 !px-0`}>
                    <ChatCircle size={20} aria-hidden="true" />
                  </button>
                  {phone ? (
                    <a aria-label={`Call ${c.name}`} href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={`${BTN_GHOST} !w-11 !px-0`}>
                      <Phone size={20} aria-hidden="true" />
                    </a>
                  ) : (
                    <span aria-hidden="true" className={`${BTN_GHOST} !w-11 !px-0 opacity-40`}>
                      <Phone size={20} />
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
