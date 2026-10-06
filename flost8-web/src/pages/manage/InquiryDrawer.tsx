import { useEffect, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, CheckCircle, Circle, FileArrowUp, X } from '@phosphor-icons/react'
import { addComment, fetchConfirmedOnDate, friendlyError, updateInquiry, type InquiryPatch } from '../../lib/manage/api'
import { canCommentOn, canEditInquiry, isHttpUrl, isPlainEmail } from '../../lib/manage/access'
import { formatDate } from '../../lib/manage/calendar'
import { conflictsFor, describeBooked } from '../../lib/manage/conflicts'
import { artistNames, inquiryTitle, SHEET_URLS } from '../../lib/manage/labels'
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from '../../lib/manage/status'
import type { Inquiry, Manager, Status } from '../../lib/manage/types'
import ActivityTimeline from './ActivityTimeline'
import MoneyPanel from './MoneyPanel'
import type { Directory } from './Workspace'
import { BTN_GHOST, BTN_PRIMARY, FOCUS_RING, INPUT, LABEL, PANEL } from './styles'
import { ConfirmDialog, StatusBadge, type ToastMsg } from './ui'
import { useLockScroll } from './useLockScroll'

function Row({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === '' || children === false) return null
  return (
    <div className="min-w-0">
      <dt className="font-grotesk text-[13px] text-[var(--ink-50)]">{label}</dt>
      <dd className="break-words font-grotesk text-[1rem] text-ink">{children}</dd>
    </div>
  )
}

export default function InquiryDrawer({
  inquiry,
  me,
  directory,
  conflicts,
  onClose,
  onChanged,
  notify,
}: {
  inquiry: Inquiry
  me: Manager
  directory: Directory
  conflicts: ReadonlySet<string>
  onClose: () => void
  onChanged: () => void
  notify: (t: ToastMsg) => void
}) {
  const reduce = useReducedMotion()

  const imported = inquiry.source === 'sheet_import'
  const canEdit = canEditInquiry(inquiry, me)
  const ownerName = directory.managers.find((m) => m.id === inquiry.owner_id)?.name
  const mySlugs = new Set(directory.artists.filter((a) => a.manager_id === me.id).map((a) => a.slug))
  const canComment = canCommentOn(inquiry, me, mySlugs)
  const sheetUrl = ownerName ? SHEET_URLS[ownerName] : undefined
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState<'status' | 'fields' | 'comment' | null>(null)
  const [confirm, setConfirm] = useState<{ next: Status; lines: string[] } | null>(null)

  useLockScroll(true)
  useEffect(() => {
    // While the double-booking question is open, Escape belongs to that dialog.
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !confirm && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, confirm])

  const [notes, setNotes] = useState(inquiry.notes ?? '')
  const [travel, setTravel] = useState(inquiry.travel_notes ?? '')
  const [contractUrl, setContractUrl] = useState(inquiry.contract_url ?? '')
  const [signed, setSigned] = useState(inquiry.contract_signed)
  const [comment, setComment] = useState('')

  const dirty =
    notes !== (inquiry.notes ?? '') ||
    travel !== (inquiry.travel_notes ?? '') ||
    contractUrl !== (inquiry.contract_url ?? '') ||
    signed !== inquiry.contract_signed

  const changed = () => {
    setVersion((v) => v + 1)
    onChanged()
  }

  async function applyStatus(next: Status) {
    setConfirm(null)
    setBusy('status')
    try {
      await updateInquiry(inquiry.id, { status: next })
      notify({ kind: 'ok', text: `Status set to ${STATUS_LABEL[next]}` })
      changed()
    } catch (err) {
      notify({ kind: 'error', text: friendlyError(err) })
    } finally {
      setBusy(null)
    }
  }

  async function requestStatus(next: Status) {
    if (next === inquiry.status || !canEdit || busy) return
    if (next === 'booking_confirmed' && inquiry.event_date && inquiry.artists.length > 0) {
      setBusy('status')
      try {
        const booked = await fetchConfirmedOnDate(inquiry.event_date, inquiry.id)
        const hits = conflictsFor(inquiry.artists, booked)
        if (hits.length > 0) {
          const name = (slug: string) => directory.artists.find((a) => a.slug === slug)?.name ?? slug
          setConfirm({ next, lines: hits.map((h) => `${name(h.slug)} already has ${describeBooked(h.row)} on this date.`) })
          setBusy(null)
          return
        }
      } catch (err) {
        notify({ kind: 'error', text: friendlyError(err) })
        setBusy(null)
        return
      }
      setBusy(null)
    }
    await applyStatus(next)
  }

  async function saveFields() {
    if (contractUrl.trim() && !isHttpUrl(contractUrl.trim())) {
      notify({ kind: 'error', text: 'The contract link must start with https://' })
      return
    }
    const patch: InquiryPatch = {
      notes: notes.trim() || null,
      travel_notes: travel.trim() || null,
      contract_url: contractUrl.trim() || null,
      contract_signed: signed,
    }
    setBusy('fields')
    try {
      await updateInquiry(inquiry.id, patch)
      notify({ kind: 'ok', text: 'Changes saved' })
      changed()
    } catch (err) {
      notify({ kind: 'error', text: friendlyError(err) })
    } finally {
      setBusy(null)
    }
  }

  async function postComment() {
    const text = comment.trim()
    if (!text) return
    setBusy('comment')
    try {
      await addComment(inquiry.id, me.id, text)
      setComment('')
      changed()
    } catch (err) {
      notify({ kind: 'error', text: friendlyError(err) })
    } finally {
      setBusy(null)
    }
  }

  const place = [inquiry.venue, inquiry.city].filter(Boolean).join(', ')
  const lineup = artistNames(inquiry.artists, directory.artists)

  return (
    <div className="fixed inset-0 z-[70] bg-black/60" onClick={onClose}>
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={inquiryTitle(inquiry)}
        data-lenis-prevent
        initial={reduce ? false : { x: 48, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 flex w-full flex-col overflow-y-auto overscroll-contain bg-base shadow-[-12px_0_40px_rgba(10,4,14,0.6)] md:max-w-[620px] md:border-l md:border-[var(--bg-line)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--bg-line)] bg-base px-4 py-4 md:px-6">
          <div className="min-w-0">
            <h2 className="break-words font-display text-3xl leading-tight text-ink md:text-4xl">{inquiryTitle(inquiry)}</h2>
            <p className="mt-1 font-grotesk text-sm text-[var(--ink-72)]">{formatDate(inquiry.event_date)}</p>
            <div className="mt-2">
              <StatusBadge status={inquiry.status} />
            </div>
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label="Close" className={`${BTN_GHOST} !h-11 !w-11 !min-h-0 shrink-0 !p-0`}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6 px-4 py-6 md:px-6">
          {imported && (
            <div role="note" className={`${PANEL} border-[var(--accent-line)] p-4 font-grotesk text-[15px] leading-relaxed text-ink`}>
              <p>
                <span className="font-medium">{ownerName ? `From ${ownerName}'s sheet.` : 'From a Google Sheet.'}</span> Change it there; it updates here within 15 min.
              </p>
              {sheetUrl && (
                <a href={sheetUrl} target="_blank" rel="noreferrer noopener" className={`${BTN_GHOST} mt-3 w-full border-[var(--accent-line)] text-ink`}>
                  <ArrowUpRight size={18} aria-hidden="true" />
                  Edit in sheet
                </a>
              )}
            </div>
          )}
          {!imported && !canEdit && (
            <p role="note" className={`${PANEL} p-4 font-grotesk text-[15px] leading-relaxed text-[var(--ink-72)]`}>
              You can view this but not change it{ownerName ? `. Only ${ownerName} (or Anuda) can edit it.` : '.'}
            </p>
          )}

          <section aria-label="Details">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Row label="Lineup">{lineup || 'No artist yet'}</Row>
              <Row label="Other artists">{inquiry.other_artists}</Row>
              <Row label="Set type">{inquiry.set_type}</Row>
              <Row label="Venue and city">{place}</Row>
              <Row label="Set time">{inquiry.set_time}</Row>
              <Row label="Set length">{inquiry.set_duration_h ? `${inquiry.set_duration_h} hours` : null}</Row>
              <Row label="Event type">{inquiry.event_type}</Row>
              <Row label="Deal type">{inquiry.deal_type}</Row>
              <Row label="Organizer">{inquiry.organizer_name}</Row>
              <Row label="Phone">
                {inquiry.organizer_phone && (
                  <a className="underline" href={`tel:${inquiry.organizer_phone.replace(/\s/g, '')}`}>
                    {inquiry.organizer_phone}
                  </a>
                )}
              </Row>
              <Row label="Email">
                {inquiry.organizer_email &&
                  (isPlainEmail(inquiry.organizer_email) ? (
                    <a className="underline" href={`mailto:${inquiry.organizer_email}`}>
                      {inquiry.organizer_email}
                    </a>
                  ) : (
                    <span>{inquiry.organizer_email}</span>
                  ))}
              </Row>
              <Row label="Brand">{inquiry.brand}</Row>
              <Row label="Collaboration">{inquiry.collab_type}</Row>
              <Row label="Lead source">{[inquiry.lead_source, inquiry.platform].filter(Boolean).join(' / ')}</Row>
              <Row label="Invoice">{inquiry.invoice_no}</Row>
              <Row label="Owner">{ownerName ?? 'Nobody yet'}</Row>
              <Row label="Came from">{inquiry.source.replace('_', ' ')}</Row>
              {inquiry.status === 'lost' && <Row label="Why it was lost">{inquiry.lost_reason}</Row>}
            </dl>
            {conflicts.has(inquiry.id) && (
              <p className="mt-4 font-grotesk text-sm text-[#FCD34D]">Another confirmed booking has the same artist on this date.</p>
            )}
          </section>

          <section aria-label="Status">
            <h3 className="mb-3 font-display text-2xl text-ink">STATUS</h3>
            {canEdit ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Change status">
                {STATUS_ORDER.map((s) => {
                  const on = s === inquiry.status
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      disabled={busy !== null}
                      onClick={() => void requestStatus(s)}
                      className={`min-h-[48px] rounded-full border px-3 font-grotesk text-sm font-medium transition active:scale-[0.98] disabled:opacity-60 ${FOCUS_RING}`}
                      style={
                        on
                          ? { color: STATUS_COLOR[s].fg, backgroundColor: STATUS_COLOR[s].bg, borderColor: STATUS_COLOR[s].fg }
                          : { color: 'rgba(255,255,255,0.72)', borderColor: 'rgba(255,255,255,0.10)' }
                      }
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  )
                })}
              </div>
            ) : (
              <StatusBadge status={inquiry.status} />
            )}
          </section>

          <MoneyPanel
            key={`${inquiry.id}-${inquiry.updated_at}-${inquiry.money?.fee}-${inquiry.money?.advance}-${inquiry.money?.balance}`}
            inquiry={inquiry}
            canEdit={canEdit}
            onSaved={changed}
            notify={notify}
          />

          <section aria-label="Notes and contract" className="space-y-4">
            <h3 className="font-display text-2xl text-ink">NOTES AND CONTRACT</h3>
            {canEdit ? (
              <>
                <div>
                  <label htmlFor="d-notes" className={LABEL}>
                    Notes
                  </label>
                  <textarea id="d-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label htmlFor="d-travel" className={LABEL}>
                    Travel notes
                  </label>
                  <textarea id="d-travel" rows={2} value={travel} onChange={(e) => setTravel(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label htmlFor="d-curl" className={LABEL}>
                    Contract link
                  </label>
                  <input id="d-curl" type="url" inputMode="url" value={contractUrl} onChange={(e) => setContractUrl(e.target.value)} placeholder="https://" className={INPUT} />
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={signed}
                  onClick={() => setSigned((s) => !s)}
                  className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-[var(--bg-line)] px-4 text-left font-grotesk text-[1rem] text-ink ${FOCUS_RING}`}
                >
                  {signed ? <CheckCircle size={24} weight="fill" className="text-[#86EFAC]" aria-hidden="true" /> : <Circle size={24} aria-hidden="true" className="text-[var(--ink-50)]" />}
                  {signed ? 'Contract signed' : 'Contract not signed yet'}
                </button>
                <button type="button" className={`${BTN_PRIMARY} w-full sm:w-auto`} disabled={!dirty || busy !== null} onClick={() => void saveFields()}>
                  {busy === 'fields' ? 'Saving...' : 'Save changes'}
                </button>
              </>
            ) : (
              <dl className="grid gap-3">
                <Row label="Notes">
                  <span className="whitespace-pre-wrap">{inquiry.notes}</span>
                </Row>
                <Row label="Travel notes">
                  <span className="whitespace-pre-wrap">{inquiry.travel_notes}</span>
                </Row>
                <Row label="Contract">{inquiry.contract_signed ? 'Signed' : 'Not signed yet'}</Row>
                <Row label="Contract link">
                  {inquiry.contract_url && isHttpUrl(inquiry.contract_url) && (
                    <a className="inline-flex items-center gap-1.5 underline" href={inquiry.contract_url} target="_blank" rel="noreferrer noopener">
                      <FileArrowUp size={18} aria-hidden="true" />
                      Open contract
                    </a>
                  )}
                </Row>
                {!inquiry.notes && !inquiry.travel_notes && !inquiry.contract_url && (
                  <p className="font-grotesk text-sm text-[var(--ink-50)]">Nothing written here yet.</p>
                )}
              </dl>
            )}
          </section>

          <section aria-label="Activity" className="space-y-4">
            <h3 className="font-display text-2xl text-ink">ACTIVITY</h3>
            {canComment && (
              <div>
                <label htmlFor="d-comment" className={LABEL}>
                  Add a comment
                </label>
                <textarea id="d-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} className={INPUT} />
                <button type="button" className={`${BTN_GHOST} mt-2`} disabled={!comment.trim() || busy !== null} onClick={() => void postComment()}>
                  {busy === 'comment' ? 'Posting...' : 'Post comment'}
                </button>
              </div>
            )}
            <ActivityTimeline inquiryId={inquiry.id} managers={directory.managers} version={version} />
          </section>
        </div>
      </motion.aside>

      {confirm && (
        <ConfirmDialog
          title="DOUBLE BOOKING?"
          body={
            <>
              {confirm.lines.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
              <span className="mt-2 block font-medium text-ink">Book anyway?</span>
            </>
          }
          confirmLabel="Book anyway"
          onConfirm={() => void applyStatus(confirm.next)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
