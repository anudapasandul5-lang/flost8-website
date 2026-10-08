import { useMemo, useState } from 'react'
import { friendlyError } from '../../lib/manage/api'
import { fetchContactHistory, mergeContacts } from '../../lib/manage/contactsApi'
import { duplicateGroups, searchContacts, type Contact, type ContactStats } from '../../lib/manage/contacts'
import { EmptyNote, Sheet } from './contactUi'
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL } from './styles'

const line = (c: Contact) => [c.organisation, c.city, c.phones[0], c.emails[0]].filter(Boolean).join(' / ')

/**
 * Merge duplicates. Step 1 lists likely duplicates (same name, phone or email) or lets you pick any contacts by hand;
 * step 2 chooses which one to keep. Bookings, notes and reminders all move across, and the merge can be undone from the
 * kept contact's history.
 */
export default function MergeDialog({
  contacts,
  stats,
  preselect,
  onClose,
  onMerged,
}: {
  contacts: Contact[]
  stats: ReadonlyMap<string, ContactStats>
  preselect?: string[]
  onClose: () => void
  /** historyId is the row that Undo needs (null if it could not be looked up; Undo is still on the contact's history). */
  onMerged: (keepId: string, historyId: number | null, count: number) => void
}) {
  const active = useMemo(() => contacts.filter((c) => !c.deleted_at), [contacts])
  const groups = useMemo(() => duplicateGroups(active), [active])
  const [selected, setSelected] = useState<string[]>(preselect ?? [])
  const [review, setReview] = useState((preselect?.length ?? 0) > 1)
  const [query, setQuery] = useState('')
  const [keepId, setKeepId] = useState<string>('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const picked = useMemo(() => selected.map((id) => active.find((c) => c.id === id)).filter((c): c is Contact => !!c), [selected, active])
  const results = useMemo(() => searchContacts(active, query).slice(0, 8), [active, query])

  function startReview(ids: string[]) {
    const list = ids.map((id) => active.find((c) => c.id === id)).filter((c): c is Contact => !!c)
    // Keep the one with the most history; ties go to the oldest record.
    const best = [...list].sort((a, b) => (stats.get(b.id)?.any_count ?? 0) - (stats.get(a.id)?.any_count ?? 0) || a.created_at.localeCompare(b.created_at))[0]
    setSelected(ids)
    setKeepId(best?.id ?? '')
    setName(best?.name ?? '')
    setReview(true)
  }

  async function run() {
    if (!keepId || picked.length < 2) return
    setBusy(true)
    setError(null)
    try {
      const others = picked.filter((c) => c.id !== keepId).map((c) => c.id)
      await mergeContacts(keepId, others, name.trim() && name.trim() !== picked.find((c) => c.id === keepId)?.name ? { name: name.trim() } : {})
      let historyId: number | null = null
      try {
        historyId = (await fetchContactHistory(keepId)).find((h) => h.kind === 'merged' && !h.data.undone)?.id ?? null
      } catch {
        historyId = null
      }
      onMerged(keepId, historyId, others.length)
    } catch (err) {
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  if (!review)
    return (
      <Sheet title="MERGE CONTACTS" intro="Merging puts everything about two or more entries onto one contact. You can undo it afterwards." onClose={onClose} wide>
        <section aria-label="Possible duplicates">
          <h3 className="mb-2 font-display text-2xl text-ink">POSSIBLE DUPLICATES</h3>
          {groups.length === 0 ? (
            <EmptyNote>No duplicates found. Nobody shares a name, phone number or email.</EmptyNote>
          ) : (
            <ul className="space-y-3">
              {groups.map((g) => (
                <li key={g.map((c) => c.id).join()} className={`${PANEL} p-4`}>
                  <ul className="space-y-1 font-grotesk text-[15px] text-ink">
                    {g.map((c) => (
                      <li key={c.id}>
                        {c.name} <span className="text-[var(--ink-50)]">{line(c)}</span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => startReview(g.map((c) => c.id))} className={`${BTN_GHOST} mt-3 border-[var(--accent-line)] text-ink`}>
                    Review and merge
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-label="Pick contacts by hand">
          <h3 className="mb-2 font-display text-2xl text-ink">PICK BY HAND</h3>
          <label htmlFor="mg-q" className={LABEL}>Search, then tick two or more</label>
          <input id="mg-q" type="search" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} className={INPUT} />
          <ul className="mt-3 space-y-1">
            {results.map((c) => (
              <li key={c.id}>
                <label className="flex min-h-[48px] items-center gap-3 rounded-xl px-2 font-grotesk text-[15px] text-ink hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                    className="h-5 w-5 accent-[var(--accent-ink)]"
                  />
                  <span className="min-w-0">
                    {c.name} <span className="text-[var(--ink-50)]">{line(c)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button type="button" disabled={selected.length < 2} onClick={() => startReview(selected)} className={`${BTN_PRIMARY} mt-4 w-full`}>
            {selected.length < 2 ? 'Tick at least two' : `Review ${selected.length} contacts`}
          </button>
        </section>
      </Sheet>
    )

  const keep = picked.find((c) => c.id === keepId)
  const bookings = picked.filter((c) => c.id !== keepId).reduce((n, c) => n + (stats.get(c.id)?.any_count ?? 0), 0)
  return (
    <Sheet title="KEEP WHICH ONE?" intro="Pick the contact to keep. The others move into it and go to Trash." onClose={onClose} busy={busy} wide>
      <fieldset>
        <legend className="sr-only">Contact to keep</legend>
        <ul className="space-y-2">
          {picked.map((c) => (
            <li key={c.id}>
              <label className={`${PANEL} flex min-h-[56px] cursor-pointer items-center gap-3 p-3 ${keepId === c.id ? 'border-[var(--accent-line)]' : ''}`}>
                <input type="radio" name="keep" checked={keepId === c.id} onChange={() => { setKeepId(c.id); setName(c.name) }} className="h-5 w-5 accent-[var(--accent-ink)]" />
                <span className="min-w-0 font-grotesk text-[15px] text-ink">
                  {c.name}
                  <span className="block text-[13px] text-[var(--ink-50)]">{line(c) || 'No details'} · {stats.get(c.id)?.any_count ?? 0} booking(s)</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <div>
        <label htmlFor="mg-name" className={LABEL}>Name to use</label>
        <input id="mg-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={INPUT} />
      </div>
      <p className="font-grotesk text-[14.5px] leading-relaxed text-[var(--ink-72)]">
        {keep ? `${keep.name} keeps` : 'The kept contact keeps'} its details, and gets the phone numbers, emails, tags and notes of the others
        {bookings > 0 ? `, plus their ${bookings} booking${bookings === 1 ? '' : 's'}` : ''}. Nothing is erased.
      </p>
      {error && (
        <p role="alert" className="font-grotesk text-[14.5px] text-[var(--error)]">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button type="button" onClick={() => setReview(false)} disabled={busy} className={`${BTN_GHOST} sm:flex-1`}>
          Back
        </button>
        <button type="button" onClick={() => void run()} disabled={busy || !keepId} className={`${BTN_PRIMARY} sm:flex-1`}>
          {busy ? 'Merging…' : `Merge ${picked.length} contacts`}
        </button>
      </div>
    </Sheet>
  )
}
