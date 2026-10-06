import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { createEvent, fetchConfirmedOnDate, friendlyError, newId } from '../../lib/manage/api'
import { conflictsFor, describeBooked } from '../../lib/manage/conflicts'
import { EMPTY_EVENT, ownerFor, validateNewEvent, type NewEventInput, type NewStatus } from '../../lib/manage/newEvent'
import { STATUS_LABEL } from '../../lib/manage/status'
import type { Artist, Manager } from '../../lib/manage/types'
import { BTN_GHOST, BTN_PRIMARY, CHIP_BASE, CHIP_OFF, CHIP_ON, INPUT, LABEL } from './styles'
import { useLockScroll } from './useLockScroll'

const STATUSES: NewStatus[] = ['new', 'quoted', 'deposit_paid', 'booking_confirmed']
const NO_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Quick "add event" form: bottom sheet on a phone, side drawer on a desktop. A manager picks from their own artists,
 * the owner from everyone's. Saved rows are app-only (source 'manual') until the cutover.
 */
export default function AddEventDialog({
  me,
  artists,
  allArtists,
  managers,
  onClose,
  onSaved,
}: {
  me: Manager
  /** Artists this person may pick. */
  artists: Artist[]
  /** Everyone's, to name the owner and the clash. */
  allArtists: Artist[]
  managers: Manager[]
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const [f, setF] = useState<NewEventInput>(EMPTY_EVENT)
  const [clashRes, setClashRes] = useState<{ key: string; lines: string[] }>({ key: '', lines: [] })
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

  // A confirmed show on the same day with the same artist: warn before saving, same rule as the status change.
  const clashKey = `${f.status}|${f.date}|${f.artists.join(',')}`
  const clash = clashRes.key === clashKey ? clashRes.lines : []
  useEffect(() => {
    if (f.status !== 'booking_confirmed' || !/^\d{4}-\d{2}-\d{2}$/.test(f.date) || f.artists.length === 0) return
    let alive = true
    fetchConfirmedOnDate(f.date, NO_ID).then(
      (booked) => {
        if (!alive) return
        const name = (slug: string) => allArtists.find((a) => a.slug === slug)?.name ?? slug
        setClashRes({ key: clashKey, lines: conflictsFor(f.artists, booked).map((h) => `${name(h.slug)} already has ${describeBooked(h.row)} on this date.`) })
      },
      () => undefined, // the check is a courtesy; saving still works if it cannot run
    )
    return () => {
      alive = false
    }
  }, [clashKey, f.status, f.date, f.artists, allArtists])

  const ownerId = useMemo(() => ownerFor(f.artists, me, allArtists), [f.artists, me, allArtists])
  const ownerName = managers.find((m) => m.id === ownerId)?.name

  const toggleArtist = (slug: string) =>
    set({ artists: f.artists.includes(slug) ? f.artists.filter((s) => s !== slug) : [...f.artists, slug] })

  async function save() {
    const problem = validateNewEvent(f)
    if (problem) return setError(problem)
    setError(null)
    setBusy(true)
    try {
      onSaved(await createEvent(f, ownerId, eventId.current))
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
        aria-label="Add event"
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-y-auto overscroll-contain rounded-t-3xl border border-b-0 border-[var(--bg-line)] bg-base md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[480px] md:rounded-none md:border-b md:border-r-0"
      >
        <div className="flex items-center justify-between px-4 pb-1 pt-4 md:px-6">
          <h2 className="font-display text-3xl leading-none text-ink">ADD EVENT</h2>
          <button type="button" aria-label="Close" onClick={onClose} className={`${BTN_GHOST} !h-11 !w-11 !min-h-0 !p-0`}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <p className="px-4 pb-4 font-grotesk text-[13.5px] text-[var(--ink-72)] md:px-6">A booking you took outside the sheet. It stays in this app only.</p>

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

          {clash.length > 0 && (
            <p role="alert" className="rounded-2xl border border-[var(--bg-line)] border-l-4 border-l-[#FF6B6B] bg-[var(--bg-raise)] p-3 font-grotesk text-[14.5px] text-ink">
              <span className="block font-medium text-[#FF6B6B]">Double booking</span>
              {clash.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </p>
          )}

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ae-org" className={LABEL}>
                Organizer
              </label>
              <input id="ae-org" name="organizer" autoComplete="off" value={f.organizer} onChange={(e) => set({ organizer: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label htmlFor="ae-phone" className={LABEL}>
                Phone / WhatsApp
              </label>
              <input id="ae-phone" name="phone" autoComplete="off" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} className={INPUT} />
            </div>
          </div>

          <p className="font-grotesk text-[13px] text-[var(--ink-50)]">
            {me.role === 'owner' ? (ownerName ? `Will be owned by ${ownerName}.` : 'Pick an artist to see who will own it.') : 'Will be added to your list.'} Money stays visible only to you and Anuda.
          </p>

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
              {busy ? 'Adding…' : clash.length > 0 ? 'Add anyway' : 'Add event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
