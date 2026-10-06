import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, SignOut } from '@phosphor-icons/react'
import { addComment, fetchDirectory, fetchInquiries, fetchLastTouch, friendlyError, saveMoney, updateInquiry } from '../../lib/manage/api'
import { conflictIds } from '../../lib/manage/conflicts'
import { applyFilters, DEFAULT_FILTERS, todayISO, type Filters } from '../../lib/manage/filters'
import { signOut, useLoad } from '../../lib/manage/hooks'
import { inquiryTitle } from '../../lib/manage/labels'
import { formatAmount, totalsByCurrency } from '../../lib/manage/money'
import { needsAction, nextBookedShow, REASON_RANK } from '../../lib/manage/needsAction'
import { summarise } from '../../lib/manage/summaries'
import type { Artist, Inquiry, Manager } from '../../lib/manage/types'
import CalendarView from './CalendarView'
import AddEventDialog from './AddEventDialog'
import FilterBar from './FilterBar'
import InquiryDrawer from './InquiryDrawer'
import InquiryList from './InquiryList'
import NeedsList, { type AdvanceKind, type NeedsRow } from './NeedsList'
import SummaryStrip, { type StripCard } from './SummaryStrip'
import TotalsBar from './TotalsBar'
import { BTN_GHOST, BTN_PRIMARY } from './styles'
import { ErrorPanel, Skeleton, Toast, UndoToast, type ToastMsg } from './ui'

// If the last-touch lookup fails, flags fall back to each row's updated_at instead of blocking the page.
const NO_TOUCH: ReadonlyMap<string, string> = new Map()

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
  const refreshInq = inq.refresh
  const refreshTouch = touch.refresh
  const reload = useCallback(() => {
    refreshInq()
    refreshTouch()
  }, [refreshInq, refreshTouch])

  const body =
    dir.state.status === 'error' || inq.state.status === 'error' ? (
      <ErrorPanel
        message={
          dir.state.status === 'error' ? dir.state.message : inq.state.status === 'error' ? inq.state.message : ''
        }
        onRetry={() => {
          dir.retry()
          inq.retry()
          touch.retry()
        }}
      />
    ) : dir.state.status === 'loading' || inq.state.status === 'loading' || touch.state.status === 'loading' ? (
      <Skeleton />
    ) : (
      <Dashboard me={me} directory={dir.state.data} inquiries={inq.state.data} lastTouch={touch.state.status === 'ok' ? touch.state.data : NO_TOUCH} reload={reload} />
    )

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
        {body}
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
}: {
  me: Manager
  directory: Directory
  inquiries: Inquiry[]
  lastTouch: ReadonlyMap<string, string>
  reload: () => void
}) {
  const mySlugs = useMemo(
    () => new Set(directory.artists.filter((a) => a.manager_id === me.id).map((a) => a.slug)),
    [directory.artists, me.id],
  )
  // Someone who looks after no artists (the owner) would see an empty "My artists" list.
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    scope: me.role === 'owner' && mySlugs.size === 0 ? 'everyone' : 'mine',
  }))
  const [view, setView] = useState<'needs' | 'all' | 'calendar'>('needs')
  const [openId, setOpenId] = useState<string | null>(null)
  // Owner taps a manager's card to look at just that manager's rows.
  const [managerFilter, setManagerFilter] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const ctx = useMemo(() => ({ mySlugs, today: todayISO() }), [mySlugs])
  const byManager = useCallback((i: Inquiry) => !managerFilter || i.owner_id === managerFilter, [managerFilter])
  const filtered = useMemo(() => applyFilters(inquiries, filters, ctx).filter(byManager), [inquiries, filters, ctx, byManager])
  const forCalendar = useMemo(() => applyFilters(inquiries, filters, ctx, { ignoreTimeframe: true }).filter(byManager), [inquiries, filters, ctx, byManager])
  const totals = useMemo(() => totalsByCurrency(filtered), [filtered])
  const conflicts = useMemo(() => conflictIds(inquiries), [inquiries])
  const open = inquiries.find((i) => i.id === openId) ?? null

  // --- needs-action: flags, and one-tap actions whose write is held for 5 s so Undo never needs a delete ---
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const [undoText, setUndoText] = useState<string | null>(null)
  const pending = useRef<{ id: string; run: () => Promise<void>; timer: number } | null>(null)

  const naCtx = useMemo(
    () => ({ today: ctx.today, now: new Date(), lastTouch, conflicts, meId: me.id, isOwner: me.role === 'owner' }),
    [ctx.today, lastTouch, conflicts, me.id, me.role],
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
  const needsRows = useMemo(() => needsAll.filter((r) => !hidden.has(r.inquiry.id) && byManager(r.inquiry)), [needsAll, hidden, byManager])
  // The strip counts what is still waiting (cards leave it the moment they are actioned) for everyone, not just the filtered manager.
  const waiting = useMemo(() => needsAll.filter((r) => !hidden.has(r.inquiry.id)), [needsAll, hidden])
  const stripCards = useMemo<StripCard[]>(
    () =>
      (me.role === 'owner' ? directory.managers.filter((m) => m.role === 'manager') : [me]).map((m) => ({
        managerId: m.id,
        name: m.name,
        artists: directory.artists.filter((a) => a.manager_id === m.id).map((a) => a.name).join(' · '),
        summary: summarise(m.id, inquiries, waiting, ctx.today),
      })),
    [me, directory, inquiries, waiting, ctx.today],
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
      return schedule(i.id, `Marked reached out · ${inquiryTitle(i)}`, () => updateInquiry(i.id, { status: 'reached_out' }))
    const m = i.money
    if (!m || !m.balance) return
    schedule(i.id, `Marked paid · ${inquiryTitle(i)}`, async () => {
      // Keeps fee = advance + balance: what was owed now counts as received.
      await saveMoney(i.id, { ...m, advance: (m.advance ?? 0) + m.balance!, balance: 0 })
      // The note is a bonus; a failed note must not report the (already saved) payment as failed.
      await addComment(i.id, me.id, `Balance paid (was ${formatAmount(m.balance, m.currency)})`).catch(() => undefined)
    })
  }

  const tabs: { id: typeof view; label: string }[] = [
    { id: 'needs', label: 'Needs you' },
    { id: 'all', label: 'All' },
    { id: 'calendar', label: 'Calendar' },
  ]

  return (
    <>
      <SummaryStrip cards={stripCards} selectedId={managerFilter} onSelect={me.role === 'owner' ? setManagerFilter : undefined} />
      {pickable.length > 0 && (
        <div className="mb-4">
          <button type="button" onClick={() => setAdding(true)} className={BTN_PRIMARY}>
            <Plus size={18} weight="bold" aria-hidden="true" />
            Add event
          </button>
        </div>
      )}
      <div role="group" aria-label="View" className="mb-5 flex gap-1 rounded-full border border-[var(--bg-line)] bg-[var(--bg-raise)] p-1 md:max-w-[460px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={view === t.id}
            onClick={() => setView(t.id)}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-full font-grotesk text-[14.5px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-ink)] ${
              view === t.id ? 'bg-[var(--accent-soft)] font-medium text-ink shadow-[inset_0_0_0_1px_var(--accent-line)]' : 'text-[var(--ink-72)]'
            }`}
          >
            {t.label}
            {t.id === 'needs' &&
              (needsRows.length > 0 ? (
                <b className="ml-2 inline-grid h-[22px] min-w-[22px] place-items-center rounded-full bg-accent px-1.5 text-[12.5px] font-semibold text-ink">{needsRows.length}</b>
              ) : (
                <span className="ml-1.5">
                  <span aria-hidden="true">✓</span>
                  <span className="sr-only"> nothing waiting</span>
                </span>
              ))}
          </button>
        ))}
      </div>

      {view === 'needs' ? (
        <NeedsList
          rows={needsRows}
          all={inquiries}
          artists={directory.artists}
          managers={directory.managers}
          me={me}
          ctx={naCtx}
          nextShow={nextShow}
          onOpen={setOpenId}
          onChased={onChased}
          onAdvance={onAdvance}
        />
      ) : (
        <>
          <FilterBar
            filters={filters}
            onChange={setFilters}
            artists={me.role === 'owner' ? directory.artists : directory.artists.filter((a) => mySlugs.has(a.slug))}
            hideTimeframe={view === 'calendar'}
            noOwnArtists={mySlugs.size === 0}
            showEveryone={me.role === 'owner'}
          />

          <p className="mb-4 font-grotesk text-sm text-[var(--ink-72)]" aria-live="polite">
            {view === 'all'
              ? `${filtered.length} ${filtered.length === 1 ? 'inquiry' : 'inquiries'}`
              : `${forCalendar.filter((i) => i.event_date).length} dated`}
          </p>

          {view === 'all' ? (
            <>
              <TotalsBar totals={totals} />
              <InquiryList
                items={filtered}
                artists={directory.artists}
                conflicts={conflicts}
                onOpen={setOpenId}
                onClear={() => setFilters({ ...DEFAULT_FILTERS, scope: 'everyone' })}
              />
            </>
          ) : (
            <CalendarView items={forCalendar} artists={directory.artists} conflicts={conflicts} onOpen={setOpenId} />
          )}
        </>
      )}

      {open && (
        <InquiryDrawer
          key={open.id}
          inquiry={open}
          me={me}
          directory={directory}
          conflicts={conflicts}
          onClose={() => setOpenId(null)}
          onChanged={reload}
          notify={setToast}
        />
      )}
      {adding && (
        <AddEventDialog
          me={me}
          artists={pickable}
          allArtists={directory.artists}
          managers={directory.managers}
          onClose={() => setAdding(false)}
          onSaved={(id) => {
            setAdding(false)
            setToast({ kind: 'ok', text: 'Event added' })
            reload()
            setOpenId(id)
          }}
        />
      )}
      <Toast toast={toast} onDone={clearToast} />
      {undoText && <UndoToast text={undoText} onUndo={undo} />}
    </>
  )
}
