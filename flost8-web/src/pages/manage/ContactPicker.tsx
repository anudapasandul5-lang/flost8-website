import { useId, useMemo, useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import { bestPhone, searchContacts, type Contact } from '../../lib/manage/contacts'
import { BTN_GHOST, FOCUS_RING, INPUT, LABEL } from './styles'

/**
 * The organiser field in Add event. Type to find someone already saved (name, phone, email, venue) and one tap fills their
 * details in; or add what you typed as a new contact. Typing a name and ignoring the list still works: the event just
 * is not linked to a contact yet.
 */
export default function ContactPicker({
  id,
  contacts,
  picked,
  text,
  onText,
  onPick,
  onClear,
  onCreate,
}: {
  id: string
  contacts: Contact[]
  picked: Contact | null
  text: string
  onText: (t: string) => void
  onPick: (c: Contact) => void
  onClear: () => void
  /** Saves `name` as a new contact and returns it. */
  onCreate: (name: string) => Promise<Contact>
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  // Enter only picks a row the user chose with the arrow keys; otherwise it must not create or overwrite anything.
  const [armed, setArmed] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listId = useId()
  const query = text.trim()

  const results = useMemo(() => (query ? searchContacts(contacts.filter((c) => !c.deleted_at), query).slice(0, 6) : []), [contacts, query])
  const exact = results.some((c) => c.name.trim().toLowerCase() === query.toLowerCase())
  // The last row is "add as new" unless that exact name is already saved.
  const rows: ({ kind: 'contact'; c: Contact } | { kind: 'new' })[] = [...results.map((c) => ({ kind: 'contact' as const, c })), ...(query && !exact ? [{ kind: 'new' as const }] : [])]

  async function choose(n: number) {
    const row = rows[n]
    if (!row) return
    setOpen(false)
    if (row.kind === 'contact') return onPick(row.c)
    setCreating(true)
    setError(null)
    try {
      onPick(await onCreate(query))
    } catch {
      setError('Could not save the new contact. The event can still be saved without it.')
    } finally {
      setCreating(false)
    }
  }

  if (picked) {
    const phone = bestPhone(picked)
    return (
      <div>
        <span className={LABEL}>Organizer</span>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] px-4 py-2.5">
          <p className="min-w-0 font-grotesk text-[15px] text-ink">
            <span className="block truncate font-medium">{picked.name}</span>
            <span className="block truncate text-[13px] text-[var(--ink-72)]">{[picked.organisation, phone].filter(Boolean).join(', ') || 'Saved contact'}</span>
          </p>
          <button type="button" onClick={onClear} aria-label="Pick a different organizer" className={`${BTN_GHOST} !h-11 !w-11 !min-h-0 shrink-0 !p-0`}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <label htmlFor={id} className={LABEL}>
        Organizer
      </label>
      <input
        id={id}
        name="organizer"
        role="combobox"
        aria-expanded={open && rows.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && rows.length > 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Type a name to find or add"
        value={text}
        onChange={(e) => {
          onText(e.target.value)
          setOpen(true)
          setActive(0)
          setArmed(false)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setArmed(true)
            setActive((a) => Math.min(a + 1, rows.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setArmed(true)
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && open && armed && rows.length > 0) {
            e.preventDefault()
            void choose(active)
          } else if (e.key === 'Escape' && open) {
            e.stopPropagation()
            setOpen(false)
          }
        }}
        className={INPUT}
      />
      {open && rows.length > 0 && (
        <ul id={listId} role="listbox" aria-label="Matching contacts" className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[var(--bg-line)] bg-[#1b1024] p-1 shadow-[0_12px_30px_rgba(10,4,14,0.6)]">
          {rows.map((row, n) => (
            <li
              key={row.kind === 'contact' ? row.c.id : 'new'}
              id={`${listId}-${n}`}
              role="option"
              aria-selected={n === active}
              onMouseDown={(e) => {
                e.preventDefault()
                void choose(n)
              }}
              onMouseEnter={() => setActive(n)}
              className={`flex min-h-[48px] cursor-pointer items-center gap-2 rounded-lg px-3 font-grotesk text-[15px] text-ink ${n === active ? 'bg-white/10' : ''} ${FOCUS_RING}`}
            >
              {row.kind === 'contact' ? (
                <span className="min-w-0">
                  <span className="block truncate">{row.c.name}</span>
                  <span className="block truncate text-[13px] text-[var(--ink-50)]">{[row.c.organisation, bestPhone(row.c)].filter(Boolean).join(', ')}</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus size={16} weight="bold" aria-hidden="true" />
                  Add &ldquo;{query}&rdquo; as a new contact
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {creating && <p className="mt-1 font-grotesk text-[13px] text-[var(--ink-72)]">Saving contact…</p>}
      {error && (
        <p role="alert" className="mt-1 font-grotesk text-[13px] text-[var(--error)]">
          {error}
        </p>
      )}
    </div>
  )
}
