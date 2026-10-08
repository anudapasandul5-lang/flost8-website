import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { createEvent, friendlyError, newId, updateEvent } from '../../lib/manage/api'
import { createContact } from '../../lib/manage/contactsApi'
import { bestPhone, defaultsFromContact, EMPTY_CONTACT, type Contact } from '../../lib/manage/contacts'
import { EMPTY_EVENT, ownerFor, toEditInput, validateNewEvent, type NewEventInput, type NewStatus } from '../../lib/manage/newEvent'
import { STATUS_LABEL } from '../../lib/manage/status'
import type { Artist, Inquiry, Manager } from '../../lib/manage/types'
import ContactPicker from './ContactPicker'
import { BTN_GHOST, BTN_PRIMARY, CHIP_BASE, CHIP_OFF, CHIP_ON, INPUT, LABEL } from './styles'
import { useLockScroll } from './useLockScroll'

const STATUSES: NewStatus[] = ['tentative', 'new', 'quoted', 'deposit_paid', 'booking_confirmed']

/**
 * Quick "add event" form: bottom sheet on a phone, side drawer on a desktop. A manager picks from their own artists,
 * the owner from everyone's. Booked and deposit-paid events also publish to the website.
 */
export default function AddEventDialog({
  me,
  artists,
  allArtists,
  managers,
  contacts,
  inquiries,
  onContactCreated,
  onClose,
  onSaved,
  editing,
  initial,
}: {
  me: Manager
  /** Artists this person may pick. */
  artists: Artist[]
  /** Everyone's, to name the owner. */
  allArtists: Artist[]
  managers: Manager[]
  /** Saved contacts, for the organizer picker. */
  contacts: Contact[]
  /** Everything this person can see, to pre-fill from a contact's last booking. */
  inquiries: Inquiry[]
  onContactCreated: (c: Contact) => void
  onClose: () => void
  onSaved: (id: string) => void
  /** Set to edit a saved event instead of adding one. Status is changed in the drawer, not here. */
  editing?: Inquiry
  /** Starting values for a new event (Duplicate). Ignored when editing. */
  initial?: NewEventInput
}) {
  const [f, setF] = useState<NewEventInput>(() => (editing ? toEditInput(editing) : (initial ?? EMPTY_EVENT)))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const eventId = useRef(newId()) // same id on every retry, so a retry never makes a duplicate
  const set = (patch: Partial<NewEventInput>) => setF((p) => ({ ...p, ...patch }))

  useLockScroll(true)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const ownerId = useMemo(() => ownerFor(f.artists, me, allArtists), [f.artists, me, allArtists])
  const ownerName = managers.find((m) => m.id === ownerId)?.name

  const picked = f.contactId ? contacts.find((c) => c.id === f.contactId) ?? null : null
  const allowed = useMemo(() => new Set(artists.map((a) => a.slug)), [artists])

  function pick(c: Contact) {
    const d = defaultsFromContact(c, inquiries)
    setF((p) => ({
      ...p,
      contactId: c.id,
      organizer: c.name,
      phone: bestPhone(c) ?? p.phone,
      email: c.emails[0] ?? '',
      city: p.city || d.city,
      venue: p.venue || d.venue,
      artists: p.artists.length ? p.artists : d.artists.filter((s) => allowed.has(s)),
    }))
  }

  async function createFromTyped(name: string): Promise<Contact> {
    const made = await createContact({ ...EMPTY_CONTACT, name, phones: [f.phone], emails: [''], types: ['client'], city: f.city, owner_id: ownerId ?? me.id })
    onContactCreated(made)
    return made
  }

  const toggleArtist = (slug: string) =>
    set({ artists: f.artists.includes(slug) ? f.artists.filter((s) => s !== slug) : [...f.artists, slug] })

  async function save() {
    const problem = validateNewEvent(f)
    if (problem) return setError(problem)
    setError(null)
    setBusy(true)
    try {
      if (editing) {
        await updateEvent(editing.id, f, editing.money)
        onSaved(editing.id)
      } else onSaved(await createEvent(f, ownerId, eventId.current))
    } catch (err) {
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  const chip = (on: boolean) => `${CHIP_BASE} ${on ? CHIP_ON : CHIP_OFF}`

  return (
    <div className="fixed inset-0 z-[70] bg-black/60" onClick={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit event' : 'Add event'}
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-y-auto overscroll-contain rounded-t-3xl border border-b-0 border-[var(--bg-line)] bg-base md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[480px] md:rounded-none md:border-b md:border-r-0"
      >
        <div className="flex items-center justify-between px-4 pb-1 pt-4 md:px-6">
          <h2 className="font-display text-3xl leading-none text-ink">{editing ? 'EDIT EVENT' : 'ADD EVENT'}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className={`${BTN_GHOST} !h-11 !w-11 !min-h-0 !p-0`}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <p className="px-4 pb-4 font-grotesk text-[13.5px] text-[var(--ink-72)] md:px-6">{editing ? 'Change anything below and save. Status is changed from the event itself.' : 'A booking you took outside the sheet. Booked and deposit-paid events appear on the website.'}</p>

        <form
          className="space-y-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-6"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <fieldset>
            <legend className={LABEL}>Artists</legend>
            <div className="flex flex-wrap gap-2">
              {artists.map((a) => (
                <button key={a.slug} type="button" aria-pressed={f.artists.includes(a.slug)} className={chip(f.artists.includes(a.slug))} onClick={() => toggleArtist(a.slug)}>
                  {a.name}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ae-date" className={LABEL}>
                Date
              </label>
              <input id="ae-date" name="date" autoComplete="off" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} className={INPUT} style={{ colorScheme: 'dark' }} required />
            </div>
            <div>
              <label htmlFor="ae-time" className={LABEL}>
                Set time (optional)
              </label>
              <input id="ae-time" name="set_time" autoComplete="off" value={f.setTime} onChange={(e) => set({ setTime: e.target.value })} placeholder="10:00 pm" className={INPUT} />
            </div>
          </div>

          <div>
            <label htmlFor="ae-name" className={LABEL}>
              Event name
            </label>
            <input id="ae-name" name="event_name" autoComplete="off" value={f.name} onChange={(e) => set({ name: e.target.value })} className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ae-venue" className={LABEL}>
                Venue
              </label>
              <input id="ae-venue" name="venue" autoComplete="off" value={f.venue} onChange={(e) => set({ venue: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label htmlFor="ae-city" className={LABEL}>
                City
              </label>
              <input id="ae-city" name="city" autoComplete="off" value={f.city} onChange={(e) => set({ city: e.target.value })} className={INPUT} />
            </div>
          </div>

          <div>
            <label htmlFor="ae-ticket" className={LABEL}>Ticket link (optional)</label>
            <input id="ae-ticket" name="ticket_link" type="url" maxLength={2000} value={f.ticketLink} onChange={(e) => set({ ticketLink: e.target.value })} placeholder="https://" className={INPUT} />
          </div>

          {!editing && (
          <fieldset>
            <legend className={LABEL}>Status</legend>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button key={s} type="button" aria-pressed={f.status === s} className={chip(f.status === s)} onClick={() => set({ status: s })}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </fieldset>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ae-fee" className={LABEL}>
                Fee
              </label>
              <input id="ae-fee" name="fee" autoComplete="off" inputMode="decimal" value={f.fee} onChange={(e) => set({ fee: e.target.value })} placeholder="120,000" className={INPUT} />
            </div>
            <fieldset>
              <legend className={LABEL}>Currency</legend>
              <div className="flex gap-2">
                {(['LKR', 'USD'] as const).map((c) => (
                  <button key={c} type="button" aria-pressed={f.currency === c} className={chip(f.currency === c)} onClick={() => set({ currency: c })}>
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="space-y-4">
            <ContactPicker
              id="ae-org"
              contacts={contacts}
              picked={picked}
              text={f.organizer}
              onText={(t) => set({ organizer: t })}
              onPick={pick}
              onClear={() => set({ contactId: null, email: '', organizer: '' })}
              onCreate={createFromTyped}
            />
            <div>
              <label htmlFor="ae-phone" className={LABEL}>
                Phone / WhatsApp
              </label>
              <input id="ae-phone" name="phone" autoComplete="off" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} className={INPUT} />
            </div>
          </div>

          {!editing && (
          <p className="font-grotesk text-[13px] text-[var(--ink-50)]">
            {me.role === 'owner'
              ? ownerName
                ? `Will be owned by ${ownerName}. Money stays visible only to you and ${ownerName}.`
                : 'Pick an artist to see who will own it.'
              : 'Will be added to your list. Money stays visible only to you and Anuda.'}
          </p>
          )}

          {error && (
            <p role="alert" className="font-grotesk text-[14.5px] text-[var(--error)]">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={busy} className={`${BTN_GHOST} flex-1`}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={`${BTN_PRIMARY} flex-1`}>
              {busy ? (editing ? 'Saving…' : 'Adding…') : editing ? 'Save changes' : 'Add event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
