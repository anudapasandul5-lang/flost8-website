import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SignOut } from '@phosphor-icons/react'
import { addComment, snoozeInquiry, fetchDirectory, fetchInquiries, fetchLastTouch, friendlyError, saveMoney, updateInquiry } from '../../lib/manage/api'
import { applyFilters, DEFAULT_FILTERS, type Filters } from '../../lib/manage/filters'
import { canSetStatus, duplicateInput, bulkSummary, runBulk } from '../../lib/manage/rowActions'
import { EMPTY_EVENT, type NewEventInput } from '../../lib/manage/newEvent'
import { isSnoozed, snoozedLabel } from '../../lib/manage/snooze'
import { STATUS_LABEL } from '../../lib/manage/status'
import { signOut, useLoad, useToday } from '../../lib/manage/hooks'
import { inquiryTitle } from '../../lib/manage/labels'
import { formatAmount, totalsByCurrency } from '../../lib/manage/money'
import { focusableRows, loadFilters, moveHighlight, overlayIsOpen, saveFilters, shortcutFor, tileTarget } from '../../lib/manage/navState'
import { needsAction, nextBookedShow, REASON_RANK, type NeedsActionContext } from '../../lib/manage/needsAction'
import { nudgeLines } from '../../lib/manage/nudge'
import { summarise } from '../../lib/manage/summaries'
import type { Artist, Inquiry, Manager, Status } from '../../lib/manage/types'
import { publishShow, resyncWebsite } from '../../lib/manage/publishShow'
import { fetchContacts, fetchContactStats, fetchOpenReminders, setContactDeleted, undoMerge } from '../../lib/manage/contactsApi'
import { bestPhone, contextBooking, pendingPayments, quietContacts, reminderBucket, type Contact, type ContactStats, type Reminder } from '../../lib/manage/contacts'
import ContactDrawer from './ContactDrawer'
import ContactFormDialog from './ContactFormDialog'
import ContactsView from './ContactsView'
import FollowUpsPanel from './FollowUpsPanel'
import MergeDialog from './MergeDialog'
import TemplatesDialog from './TemplatesDialog'
import TodayView from './TodayView'
import WhatsAppSheet from './WhatsAppSheet'
import CalendarView from './CalendarView'
import AddEventDialog from './AddEventDialog'
import FilterBar from './FilterBar'
import InquiryDrawer from './InquiryDrawer'
import InquiryList from './InquiryList'
import NeedsList, { type AdvanceKind, type NeedsRow } from './NeedsList'
import RightColumn from './RightColumn'
import Shell, { type TeamItem, type View } from './Shell'
import OverviewView from './OverviewView'
import TotalsBar from './TotalsBar'
import { BTN_GHOST } from './styles'
import { ErrorPanel, Skeleton, Toast, UndoToast, type ToastMsg } from './ui'

// If the last-touch lookup fails, flags fall back to each row's updated_at instead of blocking the page.
const NO_TOUCH: ReadonlyMap<string, string> = new Map()

// Clash flags are off: a DJ can have two or three events on one day. The views still take the set, so it can come back.
const conflicts: ReadonlySet<string> = new Set()

/** Contacts, their date/count stats and open reminders. Empty (not an error) until loaded, so the dashboard never waits on them. */
export interface CrmData {
  contacts: Contact[]
  stats: ReadonlyMap<string, ContactStats>
  reminders: Reminder[]
  reload: () => void
  /** Set when a first load of contacts, stats or reminders failed; the lists above are then empty, not truly empty. */
  error: string | null
  retry: () => void
}
const NO_CONTACTS: Contact[] = []
const NO_STATS: ReadonlyMap<string, ContactStats> = new Map()
const NO_REMINDERS: Reminder[] = []

export interface Directory {
  managers: Manager[]
  artists: Artist[]
}

/** Loads everything the signed-in manager can see, then hands it to the dashboard. */
export default function Workspace({ me }: { me: Manager }) {
  const loadDir = useCallback(() => fetchDirectory(), [])
  const loadInq = useCallback(() => fetchInquiries(), [])
  const loadTouch = useCallback(() => fetchLastTouch(), [])
  const dir = useLoad(loadDir)
  const inq = useLoad(loadInq)
  const touch = useLoad(loadTouch)
  const contactsQ = useLoad(useCallback(() => fetchContacts(), []))
  const today = useToday()
  const statsQ = useLoad(useCallback(() => fetchContactStats(today), [today]))
  const remindersQ = useLoad(useCallback(() => fetchOpenReminders(), []))
  const refreshContacts = contactsQ.refresh
  const refreshStats = statsQ.refresh
  const refreshReminders = remindersQ.refresh
  const reloadCrm = useCallback(() => {
    refreshContacts()
    refreshStats()
    refreshReminders()
  }, [refreshContacts, refreshStats, refreshReminders])
  const retryContacts = contactsQ.retry
  const retryStats = statsQ.retry
  const retryReminders = remindersQ.retry
  const crm = useMemo<CrmData>(
    () => ({
      contacts: contactsQ.state.status === 'ok' ? contactsQ.state.data : NO_CONTACTS,
      stats: statsQ.state.status === 'ok' ? statsQ.state.data : NO_STATS,
      reminders: remindersQ.state.status === 'ok' ? remindersQ.state.data : NO_REMINDERS,
      reload: reloadCrm,
      error: [contactsQ.state, statsQ.state, remindersQ.state].some((s) => s.status === 'error') ? 'Contacts could not be loaded, so the lists below may look empty.' : null,
      retry: () => {
        if (contactsQ.state.status === 'error') retryContacts()
        if (statsQ.state.status === 'error') retryStats()
        if (remindersQ.state.status === 'error') retryReminders()
      },
    }),
    [contactsQ.state, statsQ.state, remindersQ.state, reloadCrm, retryContacts, retryStats, retryReminders],
  )
  const refreshInq = inq.refresh
  const refreshTouch = touch.refresh
  const reload = useCallback(() => {
    refreshInq()
    refreshTouch()
  }, [refreshInq, refreshTouch])

  if (dir.state.status === 'ok' && inq.state.status === 'ok' && touch.state.status !== 'loading')
    return <Dashboard me={me} directory={dir.state.data} inquiries={inq.state.data} lastTouch={touch.state.status === 'ok' ? touch.state.data : NO_TOUCH} reload={reload} crm={crm} />

  const failed = dir.state.status === 'error' ? dir.state.message : inq.state.status === 'error' ? inq.state.message : null
  return (
    <main id="main-content" tabIndex={-1} className="min-h-[100dvh] bg-base px-4 pb-24 pt-6 outline-none md:px-8 md:pt-10">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-4xl leading-none text-ink md:text-6xl">BOOKINGS</h1>
            <p className="mt-1 truncate font-grotesk text-sm text-[var(--ink-50)]">Signed in as {me.name}</p>
          </div>
          <button type="button" onClick={() => void signOut()} className={BTN_GHOST}>
            <SignOut size={18} aria-hidden="true" />
            Sign out
          </button>
        </header>
        {failed !== null ? (
          <ErrorPanel
            message={failed}
            onRetry={() => {
              dir.retry()
              inq.retry()
              touch.retry()
            }}
          />
        ) : (
          <Skeleton />
        )}
      </div>
    </main>
  )
}

function Dashboard({
  me,
  directory,
  inquiries,
  lastTouch,
  reload,
  crm,
}: {
  me: Manager
  directory: Directory
  inquiries: Inquiry[]
  lastTouch: ReadonlyMap<string, string>
  reload: () => void
  crm: CrmData
}) {
  const mySlugs = useMemo(
    () => new Set(directory.artists.filter((a) => a.manager_id === me.id).map((a) => a.slug)),
    [directory.artists, me.id],
  )
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState<{ initial?: NewEventInput } | null>(null)
  const openAdd = useCallback((date?: string) => setAdding(date ? { initial: { ...EMPTY_EVENT, date } } : {}), [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const clearToast = useCallback(() => setToast(null), [])
  const [contactId, setContactId] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState<{ id?: string } | null>(null)
  const [merging, setMerging] = useState<string[] | null>(null)
  const [wa, setWa] = useState<{ contact: Contact | null; inquiry?: Inquiry; phone: string | null; name: string } | null>(null)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templatesVersion, setTemplatesVersion] = useState(0)
  const [mergeUndo, setMergeUndo] = useState<{ historyId: number; text: string } | null>(null)
  const crmReload = crm.reload
  const reloadAll = useCallback(() => {
    reload()
    crmReload()
  }, [reload, crmReload])
  useEffect(() => {
    if (!mergeUndo) return
    const t = window.setTimeout(() => setMergeUndo(null), 20000)
    return () => window.clearTimeout(t)
  }, [mergeUndo])
  const [resyncBusy, setResyncBusy] = useState(false)
  const onPublish = useCallback(async (id: string) => {
    const said = (outcome: string) => outcome === 'already_synced' ? 'Already on the site from the sheet' : outcome === 'held_back' ? 'Not put on the website: this event is held back' : 'Website list updated'
    try {
      const outcome = await publishShow(id)
      if (outcome === 'already_synced' || outcome === 'held_back') setToast({ kind: 'ok', text: said(outcome) })
    } catch (error) {
      setToast({ kind: 'error', text: 'Saved, but the website list was not updated', retry: () => {
        setToast({ kind: 'ok', text: 'Retrying website update…' })
        void publishShow(id).then(outcome => setToast({ kind: 'ok', text: said(outcome) })).catch(err => setToast({ kind: 'error', text: err instanceof Error ? err.message : 'Website update failed', retry: () => void onPublish(id) }))
      } })
      // Failure details stay available without leaking any private event values.
      console.warn('Website update failed', id, error instanceof Error ? error.message : 'request failed')
    }
  }, [])
  async function resync() {
    if (resyncBusy) return
    setResyncBusy(true)
    try { await resyncWebsite(); setToast({ kind: 'ok', text: 'Website list updated' }); reload() }
    catch (error) { setToast({ kind: 'error', text: error instanceof Error ? error.message : 'Website update failed', retry: () => void resync() }) }
    finally { setResyncBusy(false) }
  }

  const today = useToday()
  const ctx = useMemo(() => ({ mySlugs, today }), [mySlugs, today])
  const open = inquiries.find((i) => i.id === openId) ?? null
  const editing = inquiries.find((i) => i.id === editingId) ?? null
  const openContact = crm.contacts.find((c) => c.id === contactId) ?? null
  const formEditing = contactForm?.id ? crm.contacts.find((c) => c.id === contactForm.id) : undefined
  const followUpCount = useMemo(
    () => crm.reminders.filter((r) => r.contact_id && (reminderBucket(r, ctx.today) === 'overdue' || reminderBucket(r, ctx.today) === 'today')).length,
    [crm.reminders, ctx.today],
  )
  const whatsAppForContact = (c: Contact) => setWa({ contact: c, inquiry: contextBooking(c.id, inquiries, ctx.today), phone: bestPhone(c), name: c.name })
  const whatsAppForInquiry = (i: Inquiry) => {
    const c = crm.contacts.find((x) => x.id === i.contact_id && !x.deleted_at) ?? null
    setWa({ contact: c, inquiry: i, phone: (c && bestPhone(c)) || i.organizer_phone, name: c?.name ?? i.organizer_name ?? 'there' })
  }
  const restoreContact = async (c: Contact) => {
    try {
      await setContactDeleted(c.id, false, me.id)
      setToast({ kind: 'ok', text: 'Restored' })
      reloadAll()
    } catch (err) {
      setToast({ kind: 'error', text: friendlyError(err) })
    }
  }

  // --- needs-action: flags, and one-tap actions whose write is held for 5 s so Undo never needs a delete ---
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const [undoText, setUndoText] = useState<string | null>(null)
  const pending = useRef<{ id: string; run: () => Promise<void>; timer: number } | null>(null)

  const naCtx = useMemo(
    () => ({ today: ctx.today, now: new Date(), lastTouch, conflicts, meId: me.id, isOwner: me.role === 'owner' }),
    [ctx.today, lastTouch, me.id, me.role],
  )
  const needsAll = useMemo<NeedsRow[]>(
    () =>
      inquiries
        .map((inquiry) => ({ inquiry, reasons: needsAction(inquiry, naCtx) }))
        .filter((r) => r.reasons.length > 0)
        .sort(
          (a, b) =>
            REASON_RANK[a.reasons[0]] - REASON_RANK[b.reasons[0]] ||
            (a.inquiry.event_date ?? '9999').localeCompare(b.inquiry.event_date ?? '9999'),
        ),
    [inquiries, naCtx],
  )
  // The owner's follow-ups list also shows what is snoozed (dimmed), so a hidden row is never lost track of.
  const snoozedRows = useMemo<NeedsRow[]>(
    () =>
      me.role !== 'owner'
        ? []
        : inquiries
            .filter((i) => isSnoozed(i, ctx.today))
            .map((inquiry) => ({ inquiry, reasons: needsAction(inquiry, { ...naCtx, includeSnoozed: true }) }))
            .filter((r) => r.reasons.length > 0)
            .sort((a, b) => (a.inquiry.snoozed_until ?? '').localeCompare(b.inquiry.snoozed_until ?? '')),
    [me.role, inquiries, naCtx, ctx.today],
  )
  // What is still waiting (cards leave it the moment they are actioned) for everyone, not just the filtered manager.
  const waiting = useMemo(() => needsAll.filter((r) => !hidden.has(r.inquiry.id)), [needsAll, hidden])
  const team = useMemo<TeamItem[]>(
    () =>
      me.role !== 'owner'
        ? []
        : directory.managers
            .filter((m) => m.role === 'manager')
            .map((m) => {
              const s = summarise(m.id, inquiries, waiting, ctx.today)
              return { id: m.id, name: m.name, open: s.need, top: s.top }
            }),
    [me.role, directory.managers, inquiries, waiting, ctx.today],
  )
  const pickable = me.role === 'owner' ? directory.artists : directory.artists.filter((a) => mySlugs.has(a.slug))
  const nextShow = useMemo(
    () => nextBookedShow(inquiries.filter((i) => me.role === 'owner' || i.owner_id === me.id), ctx.today),
    [inquiries, me.id, me.role, ctx.today],
  )

  const unhide = useCallback((id: string) => {
    setHidden((h) => {
      const n = new Set(h)
      n.delete(id)
      return n
    })
  }, [])

  const flush = useCallback(async () => {
    const p = pending.current
    if (!p) return
    pending.current = null
    window.clearTimeout(p.timer)
    setUndoText(null)
    try {
      await p.run()
      reload()
      // Two fetches refresh the flags; keep the card hidden until both have had time to land, so it does not flicker back.
      window.setTimeout(() => unhide(p.id), 2500)
    } catch (err) {
      unhide(p.id)
      setToast({ kind: 'error', text: friendlyError(err) })
    }
  }, [reload, unhide])

  const schedule = useCallback(
    (id: string, text: string, run: () => Promise<void>) => {
      void flush()
      setHidden((h) => new Set(h).add(id))
      setUndoText(text)
      pending.current = { id, run, timer: window.setTimeout(() => void flush(), 5000) }
    },
    [flush],
  )

  const undo = () => {
    const p = pending.current
    if (!p) return
    window.clearTimeout(p.timer)
    pending.current = null
    setUndoText(null)
    unhide(p.id)
  }

  // A held write must not be lost when the tab is closed, hidden, locked or left within the 5 seconds.
  useEffect(() => {
    const out = () => void flush()
    const vis = () => document.visibilityState === 'hidden' && out()
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pagehide', out)
    return () => {
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pagehide', out)
      out()
    }
  }, [flush])

  const onChased = (i: Inquiry) =>
    schedule(i.id, `Marked chased · ${inquiryTitle(i)}`, () => addComment(i.id, me.id, 'Chased today'))

  const onAdvance = (i: Inquiry, kind: AdvanceKind) => {
    if (kind === 'reached_out')
      return schedule(i.id, `Marked reached out · ${inquiryTitle(i)}`, async () => {
        await updateInquiry(i.id, { status: 'reached_out' })
        if (i.source === 'manual') await onPublish(i.id)
      })
    const m = i.money
    if (!m || !m.balance) return
    schedule(i.id, `Marked paid · ${inquiryTitle(i)}`, async () => {
      // Keeps fee = advance + balance: what was owed now counts as received.
      await saveMoney(i.id, { ...m, advance: (m.advance ?? 0) + m.balance!, balance: 0 })
      // The note is a bonus; a failed note must not report the (already saved) payment as failed.
      await addComment(i.id, me.id, `Balance paid (was ${formatAmount(m.balance, m.currency)})`).catch(() => undefined)
    })
  }

  const onDuplicate = (i: Inquiry) => setAdding({ initial: duplicateInput(i, new Set(pickable.map((a) => a.slug))) })

  const onSnooze = (i: Inquiry, until: string | null) => {
    if (until === null) {
      void snoozeInquiry(i.id, null).then(
        () => {
          setToast({ kind: 'ok', text: `Unsnoozed · ${inquiryTitle(i)}` })
          reload()
        },
        (err) => setToast({ kind: 'error', text: friendlyError(err) }),
      )
      return
    }
    schedule(i.id, `${snoozedLabel(until, ctx.today)} · ${inquiryTitle(i)}`, () => snoozeInquiry(i.id, until))
  }

  const onSetStatus = (i: Inquiry, status: Status) => {
    // The menu never offers this on a sheet row; refuse here too, so no other caller can queue a write the importer would undo.
    if (!canSetStatus(i, me)) return setToast({ kind: 'error', text: 'Sheet rows cannot be changed here. Edit them in the sheet.' })
    schedule(i.id, `Marked ${STATUS_LABEL[status].toLowerCase()} · ${inquiryTitle(i)}`, async () => {
      await updateInquiry(i.id, { status })
      if (i.source === 'manual') await onPublish(i.id)
    })
  }

  // One undo window for the whole batch; then each row is updated on its own so one refusal never blocks the rest.
  const onBulkStatus = (wanted: string[], status: 'lost' | 'spam') => {
    // Only rows this person may status-edit (never sheet rows), judged on the current data.
    const ids = wanted.filter((id) => {
      const row = inquiries.find((x) => x.id === id)
      return !!row && canSetStatus(row, me)
    })
    if (ids.length === 0) return setToast({ kind: 'error', text: 'None of those rows can be changed here.' })
    schedule(`bulk:${ids.join(',')}`, `Marked ${ids.length} as ${STATUS_LABEL[status].toLowerCase()}`, async () => {
      const result = await runBulk(ids, (id) => updateInquiry(id, { status }))
      await Promise.all(result.done.filter((id) => inquiries.find((x) => x.id === id)?.source === 'manual').map((id) => onPublish(id)))
      setToast({ kind: result.done.length === result.total ? 'ok' : 'error', text: bulkSummary(result, 'updated') })
    })
  }

  return (
    <>
      {crm.error && (
        <div role="alert" className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-4 pt-4 md:px-8">
          <p className="font-grotesk text-[14.5px] text-[var(--error)]">{crm.error}</p>
          <button type="button" onClick={crm.retry} className={BTN_GHOST}>
            Try again
          </button>
        </div>
      )}
      <Shell me={me} team={team} needCount={waiting.length} followUpCount={followUpCount} totalCount={inquiries.length} onAdd={pickable.length > 0 ? () => openAdd() : undefined} onResync={me.role === 'owner' ? () => void resync() : undefined} resyncBusy={resyncBusy}>
        {({ view, setView, managerFilter, setManagerFilter }) => (
          <Views
            me={me}
            directory={directory}
            inquiries={inquiries}
            mySlugs={mySlugs}
            today={ctx.today}
            view={view}
            managerFilter={managerFilter}
            setManagerFilter={setManagerFilter}
            setView={setView}
            team={team}
            waiting={waiting}
            snoozedRows={snoozedRows}
            conflicts={conflicts}
            naCtx={naCtx}
            nextShow={nextShow}
            onAdd={pickable.length > 0 ? openAdd : undefined}
            onOpen={setOpenId}
            onChased={onChased}
            onAdvance={onAdvance}
            onDuplicate={onDuplicate}
            onSetStatus={onSetStatus}
            onSnooze={onSnooze}
            onBulkStatus={onBulkStatus}
            crm={crm}
            onOpenContact={setContactId}
            onNewContact={() => setContactForm({})}
            onMerge={() => setMerging([])}
            onTemplates={() => setTemplatesOpen(true)}
            onWhatsAppContact={whatsAppForContact}
            onWhatsAppInquiry={whatsAppForInquiry}
            onRestoreContact={(c) => void restoreContact(c)}
            reloadAll={reloadAll}
            notify={setToast}
          />
        )}
      </Shell>

      {open && (
        <InquiryDrawer
          key={open.id}
          inquiry={open}
          me={me}
          directory={directory}
          onClose={() => setOpenId(null)}
          onChanged={reload}
          onEdit={() => {
            setEditingId(open.id)
            setOpenId(null)
          }}
          notify={setToast}
          onPublish={onPublish}
          contacts={crm.contacts}
          onOpenContact={setContactId}
          onContactCreated={() => crmReload()}
        />
      )}
      {adding && (
        <AddEventDialog
          initial={adding.initial}
          me={me}
          artists={pickable}
          allArtists={directory.artists}
          managers={directory.managers}
          contacts={crm.contacts}
          inquiries={inquiries}
          onContactCreated={() => crmReload()}
          onClose={() => setAdding(null)}
          onSaved={(id) => {
            setAdding(null)
            setToast({ kind: 'ok', text: 'Event added' })
            reload()
            setOpenId(id)
            void onPublish(id)
          }}
        />
      )}
      {editing && (
        <AddEventDialog
          key={editing.id}
          me={me}
          // Anyone already on the event stays pickable, even another manager's artist, so saving never drops them.
          artists={directory.artists.filter((a) => pickable.some((p) => p.slug === a.slug) || editing.artists.includes(a.slug))}
          allArtists={directory.artists}
          managers={directory.managers}
          contacts={crm.contacts}
          inquiries={inquiries}
          onContactCreated={() => crmReload()}
          editing={editing}
          onClose={() => setEditingId(null)}
          onSaved={(id) => {
            setEditingId(null)
            setToast({ kind: 'ok', text: 'Event updated' })
            reload()
            setOpenId(id)
            void onPublish(id)
          }}
        />
      )}
      {openContact && (
        <ContactDrawer
          key={openContact.id}
          contact={openContact}
          me={me}
          managers={directory.managers}
          stats={crm.stats}
          inquiries={inquiries}
          artists={directory.artists}
          today={ctx.today}
          onClose={() => setContactId(null)}
          onChanged={reloadAll}
          onEdit={() => setContactForm({ id: openContact.id })}
          onMerge={() => setMerging([openContact.id])}
          onOpenInquiry={setOpenId}
          onWhatsApp={() => whatsAppForContact(openContact)}
          notify={setToast}
        />
      )}
      {contactForm && (
        <ContactFormDialog
          me={me}
          managers={directory.managers}
          contacts={crm.contacts}
          editing={formEditing}
          onClose={() => setContactForm(null)}
          onSaved={(c) => {
            const wasNew = !contactForm.id
            setContactForm(null)
            setToast({ kind: 'ok', text: wasNew ? 'Contact added' : 'Contact updated' })
            reloadAll()
            if (wasNew) setContactId(c.id)
          }}
          onOpenExisting={(id) => {
            setContactForm(null)
            setContactId(id)
          }}
        />
      )}
      {merging && (
        <MergeDialog
          contacts={crm.contacts}
          stats={crm.stats}
          preselect={merging.length > 0 ? merging : undefined}
          onClose={() => setMerging(null)}
          onMerged={(keepId, historyId, n) => {
            setMerging(null)
            reloadAll()
            setContactId(keepId)
            if (historyId) setMergeUndo({ historyId, text: `Merged ${n + 1} contacts into one` })
            else setToast({ kind: 'ok', text: `Merged ${n + 1} contacts into one` })
          }}
        />
      )}
      {templatesOpen && <TemplatesDialog onClose={() => setTemplatesOpen(false)} onChanged={() => setTemplatesVersion((v) => v + 1)} />}
      {wa && (
        <WhatsAppSheet
          me={me}
          contact={wa.contact}
          inquiry={wa.inquiry}
          phone={wa.phone}
          name={wa.name}
          onClose={() => setWa(null)}
          onManageTemplates={() => setTemplatesOpen(true)}
          onLogged={crmReload}
          notify={setToast}
          version={templatesVersion}
        />
      )}
      {mergeUndo && (
        <UndoToast
          text={mergeUndo.text}
          onUndo={() => {
            const id = mergeUndo.historyId
            setMergeUndo(null)
            undoMerge(id).then(
              () => {
                setToast({ kind: 'ok', text: 'Merge undone' })
                reloadAll()
              },
              (err) => setToast({ kind: 'error', text: friendlyError(err) }),
            )
          }}
        />
      )}
      <Toast toast={toast} onDone={clearToast} />
      {undoText && <UndoToast text={undoText} onUndo={undo} />}
    </>
  )
}

/** The open view's content. Lives inside Shell so it can read the view and manager filter Shell holds; owns the list filters. */
function Views({
  me,
  directory,
  inquiries,
  mySlugs,
  today,
  view,
  managerFilter,
  setManagerFilter,
  setView,
  team,
  waiting,
  snoozedRows,
  conflicts,
  naCtx,
  nextShow,
  onAdd,
  onOpen,
  onChased,
  onAdvance,
  onDuplicate,
  onSetStatus,
  onSnooze,
  onBulkStatus,
  crm,
  onOpenContact,
  onNewContact,
  onMerge,
  onTemplates,
  onWhatsAppContact,
  onWhatsAppInquiry,
  onRestoreContact,
  reloadAll,
  notify,
}: {
  me: Manager
  directory: Directory
  inquiries: Inquiry[]
  mySlugs: ReadonlySet<string>
  today: string
  view: View
  managerFilter: string | null
  setManagerFilter: (id: string | null) => void
  setView: (v: View) => void
  team: TeamItem[]
  waiting: NeedsRow[]
  snoozedRows: NeedsRow[]
  conflicts: ReadonlySet<string>
  naCtx: NeedsActionContext
  nextShow: Inquiry | undefined
  /** Opens Add event, on a given day when one is passed. Omitted when this person cannot add events. */
  onAdd?: (date?: string) => void
  onOpen: (id: string) => void
  onChased: (i: Inquiry) => void
  onAdvance: (i: Inquiry, kind: AdvanceKind) => void
  onDuplicate: (i: Inquiry) => void
  onSetStatus: (i: Inquiry, status: Status) => void
  onSnooze: (i: Inquiry, until: string | null) => void
  onBulkStatus: (ids: string[], status: 'lost' | 'spam') => void
  crm: CrmData
  onOpenContact: (id: string) => void
  onNewContact: () => void
  onMerge: () => void
  onTemplates: () => void
  onWhatsAppContact: (c: Contact) => void
  onWhatsAppInquiry: (i: Inquiry) => void
  onRestoreContact: (c: Contact) => void
  reloadAll: () => void
  notify: (t: ToastMsg) => void
}) {
  // Someone who looks after no artists (the owner) would see an empty "My artists" list.
  // Remembered per person; a remembered scope or artist this person can no longer use is dropped.
  const [filters, setFilters] = useState<Filters>(() => {
    const owner = me.role === 'owner'
    const noOwn = owner && mySlugs.size === 0
    const f = loadFilters(me.id, { ...DEFAULT_FILTERS, scope: noOwn ? 'everyone' : 'mine' })
    const allowed = owner ? directory.artists : directory.artists.filter((a) => mySlugs.has(a.slug))
    return { ...f, scope: !owner ? 'mine' : noOwn ? 'everyone' : f.scope, artist: allowed.some((a) => a.slug === f.artist) ? f.artist : '' }
  })
  useEffect(() => saveFilters(me.id, filters), [me.id, filters])

  // Desktop shortcuts: "/" search, "N" add event, Up/Down walk the rows (real focus, so Enter opens the row natively).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const act = shortcutFor(e, overlayIsOpen(document))
      if (!act) return
      if (act === 'search') {
        const box = document.getElementById('m-search')
        if (!box) return
        e.preventDefault()
        box.focus()
      } else if (act === 'add') {
        if (!onAdd) return
        e.preventDefault()
        onAdd()
      } else {
        const rows = focusableRows(document)
        if (rows.length === 0) return
        e.preventDefault()
        const ids = rows.map((r) => r.dataset.rowId ?? '')
        const here = document.activeElement instanceof HTMLElement ? (document.activeElement.closest<HTMLElement>('[data-row-id]')?.dataset.rowId ?? null) : null
        const next = moveHighlight(ids, here, act)
        if (next !== null) rows[ids.indexOf(next)]?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAdd])
  const ctx = useMemo(() => ({ mySlugs, today }), [mySlugs, today])
  // A manager's own shows: ones they own, plus any carrying one of their artists (joint bills owned by another manager).
  const mine = useMemo(
    () => (me.role === 'owner' ? inquiries : inquiries.filter((i) => i.owner_id === me.id || i.artists.some((s) => mySlugs.has(s)))),
    [inquiries, me.role, me.id, mySlugs],
  )
  const byManager = useCallback((i: Inquiry) => !managerFilter || i.owner_id === managerFilter, [managerFilter])
  const filtered = useMemo(() => applyFilters(inquiries, filters, ctx).filter(byManager), [inquiries, filters, ctx, byManager])
  const forCalendar = useMemo(() => applyFilters(inquiries, filters, ctx, { ignoreTimeframe: true }).filter(byManager), [inquiries, filters, ctx, byManager])
  const totals = useMemo(() => totalsByCurrency(filtered), [filtered])
  const needsRows = useMemo(() => waiting.filter((r) => byManager(r.inquiry)), [waiting, byManager])
  const pickable = me.role === 'owner' ? directory.artists : directory.artists.filter((a) => mySlugs.has(a.slug))
  // The owner sees every show; a manager sees only their own artists' shows. The manager filter narrows both.
  const showsFor = useMemo(() => mine.filter(byManager), [mine, byManager])
  const managerRows = useMemo(
    () =>
      team.map((t) => ({
        ...t,
        artistCount: directory.artists.filter((a) => a.manager_id === t.id).length,
        nudgeLines: me.role === 'owner' ? nudgeLines(t.id, waiting, inquiries, naCtx) : undefined,
      })),
    [team, directory.artists, me.role, waiting, inquiries, naCtx],
  )

  const reminders = managerFilter ? crm.reminders.filter((r) => r.manager_id === managerFilter) : crm.reminders
  const followUps = (title?: string) => (
    <FollowUpsPanel
      reminders={reminders}
      contacts={crm.contacts}
      managers={directory.managers}
      me={me}
      today={today}
      onOpenContact={onOpenContact}
      onWhatsApp={onWhatsAppContact}
      onChanged={reloadAll}
      notify={notify}
      title={title}
    />
  )

  if (view === 'contacts')
    return (
      <ContactsView
        me={me}
        managers={directory.managers}
        contacts={crm.contacts}
        stats={crm.stats}
        managerFilter={managerFilter}
        today={today}
        onOpen={onOpenContact}
        onNew={onNewContact}
        onMerge={onMerge}
        onTemplates={onTemplates}
        onWhatsApp={onWhatsAppContact}
        onRestore={onRestoreContact}
      />
    )

  if (view === 'today') {
    const dueCount = reminders.filter((r) => r.contact_id && (reminderBucket(r, today) === 'overdue' || reminderBucket(r, today) === 'today')).length
    return (
      <TodayView
        me={me}
        today={today}
        followUps={followUps()}
        followUpCount={dueCount}
        needCount={needsRows.length}
        needs={
          needsRows.length > 0 ? (
            <section aria-label="Needs you">
              <h2 className="mb-3 font-display text-2xl text-ink">
                NEEDS YOU <span className="text-[var(--ink-50)]">({needsRows.length})</span>
              </h2>
              <NeedsList rows={needsRows} all={inquiries} artists={directory.artists} managers={directory.managers} me={me} ctx={naCtx} nextShow={nextShow} onOpen={onOpen} onChased={onChased} onAdvance={onAdvance} onWhatsApp={onWhatsAppInquiry} onDuplicate={onDuplicate} onSetStatus={onSetStatus} onSnooze={onSnooze} compactEmpty />
            </section>
          ) : null
        }
        payments={pendingPayments(showsFor, today)}
        quiet={quietContacts(crm.contacts, crm.stats, today, me.role === 'owner' ? null : me.id)}
        stats={crm.stats}
        onOpenInquiry={onOpen}
        onOpenContact={onOpenContact}
        onWhatsApp={onWhatsAppContact}
      />
    )
  }

  if (view === 'overview')
    return (
      <div>
      {followUps('TEAM FOLLOW-UPS DUE')}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <OverviewView
          inquiries={mine}
          waiting={waiting}
          snoozed={snoozedRows}
          today={today}
          role={me.role}
          managerFilter={managerFilter}
          managers={directory.managers}
          artists={directory.artists}
          me={me}
          ctx={naCtx}
          onOpen={onOpen}
          onChased={onChased}
          onViewAll={() => setView('needs')}
          onTile={(tile) => {
            const go = tileTarget(tile, me.role, filters)
            if (go.filters) setFilters(go.filters)
            setView(go.view)
          }}
        />
        <RightColumn
          me={me}
          managers={directory.managers}
          artists={directory.artists}
          inquiries={showsFor}
          today={today}
          conflicts={conflicts}
          managerRows={managerRows}
          managerFilter={managerFilter}
          onSelectManager={setManagerFilter}
          onOpen={onOpen}
          version={inquiries}
        />
      </div>
      </div>
    )

  if (view === 'needs')
    return (
      <>
      {followUps('TEAM FOLLOW-UPS DUE')}
      <NeedsList
        rows={needsRows}
        all={inquiries}
        artists={directory.artists}
        managers={directory.managers}
        me={me}
        ctx={naCtx}
        nextShow={nextShow}
        onOpen={onOpen}
        onChased={onChased}
        onAdvance={onAdvance}
        onWhatsApp={onWhatsAppInquiry}
        onDuplicate={onDuplicate}
        onSetStatus={onSetStatus}
        onSnooze={onSnooze}
      />
      </>
    )

  return (
    <>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        artists={pickable}
        hideTimeframe={view === 'calendar'}
        noOwnArtists={mySlugs.size === 0}
        showEveryone={me.role === 'owner'}
      />

      {view === 'calendar' && (
        <p className="mb-4 font-grotesk text-sm text-[var(--ink-72)]" aria-live="polite">
          {forCalendar.filter((i) => i.event_date).length} dated
        </p>
      )}

      {view === 'all' ? (
        <>
          <TotalsBar count={filtered.length} totals={totals} />
          <InquiryList
            items={filtered}
            artists={directory.artists}
            conflicts={conflicts}
            today={today}
            me={me}
            managers={directory.managers}
            onDuplicate={onDuplicate}
            onSetStatus={onSetStatus}
            onSnooze={onSnooze}
            onBulkStatus={onBulkStatus}
            onOpen={onOpen}
            onClear={() => setFilters({ ...DEFAULT_FILTERS, scope: 'everyone' })}
          />
        </>
      ) : (
        <CalendarView items={forCalendar} artists={directory.artists} conflicts={conflicts} today={today} onOpen={onOpen} onAddOnDate={onAdd} />
      )}
    </>
  )
}
