import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SignOut } from '@phosphor-icons/react'
import { addComment, fetchDirectory, fetchInquiries, fetchLastTouch, friendlyError, saveMoney, updateInquiry } from '../../lib/manage/api'
import { conflictIds } from '../../lib/manage/conflicts'
import { applyFilters, DEFAULT_FILTERS, todayISO, type Filters } from '../../lib/manage/filters'
import { signOut, useLoad } from '../../lib/manage/hooks'
import { inquiryTitle } from '../../lib/manage/labels'
import { formatAmount, totalsByCurrency } from '../../lib/manage/money'
import { needsAction, nextBookedShow, REASON_RANK, type NeedsActionContext } from '../../lib/manage/needsAction'
import { summarise } from '../../lib/manage/summaries'
import type { Artist, Inquiry, Manager } from '../../lib/manage/types'
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

  if (dir.state.status === 'ok' && inq.state.status === 'ok' && touch.state.status !== 'loading')
    return <Dashboard me={me} directory={dir.state.data} inquiries={inq.state.data} lastTouch={touch.state.status === 'ok' ? touch.state.data : NO_TOUCH} reload={reload} />

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
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const ctx = useMemo(() => ({ mySlugs, today: todayISO() }), [mySlugs])
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

  return (
    <>
      <Shell me={me} team={team} needCount={waiting.length} totalCount={inquiries.length} onAdd={pickable.length > 0 ? () => setAdding(true) : undefined}>
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
            conflicts={conflicts}
            naCtx={naCtx}
            nextShow={nextShow}
            onOpen={setOpenId}
            onChased={onChased}
            onAdvance={onAdvance}
          />
        )}
      </Shell>

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
  conflicts,
  naCtx,
  nextShow,
  onOpen,
  onChased,
  onAdvance,
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
  conflicts: ReadonlySet<string>
  naCtx: NeedsActionContext
  nextShow: Inquiry | undefined
  onOpen: (id: string) => void
  onChased: (i: Inquiry) => void
  onAdvance: (i: Inquiry, kind: AdvanceKind) => void
}) {
  // Someone who looks after no artists (the owner) would see an empty "My artists" list.
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    scope: me.role === 'owner' && mySlugs.size === 0 ? 'everyone' : 'mine',
  }))
  const ctx = useMemo(() => ({ mySlugs, today }), [mySlugs, today])
  const byManager = useCallback((i: Inquiry) => !managerFilter || i.owner_id === managerFilter, [managerFilter])
  const filtered = useMemo(() => applyFilters(inquiries, filters, ctx).filter(byManager), [inquiries, filters, ctx, byManager])
  const forCalendar = useMemo(() => applyFilters(inquiries, filters, ctx, { ignoreTimeframe: true }).filter(byManager), [inquiries, filters, ctx, byManager])
  const totals = useMemo(() => totalsByCurrency(filtered), [filtered])
  const needsRows = useMemo(() => waiting.filter((r) => byManager(r.inquiry)), [waiting, byManager])
  const pickable = me.role === 'owner' ? directory.artists : directory.artists.filter((a) => mySlugs.has(a.slug))
  // The owner sees every show; a manager sees only their own artists' shows. The manager filter narrows both.
  const showsFor = useMemo(() => inquiries.filter((i) => (me.role === 'owner' || i.owner_id === me.id) && byManager(i)), [inquiries, me.role, me.id, byManager])
  const managerRows = useMemo(
    () => team.map((t) => ({ ...t, artistCount: directory.artists.filter((a) => a.manager_id === t.id).length })),
    [team, directory.artists],
  )

  if (view === 'overview')
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <OverviewView
          inquiries={me.role === 'owner' ? inquiries : inquiries.filter((i) => i.owner_id === me.id)}
          waiting={waiting}
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
    )

  if (view === 'needs')
    return (
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
      />
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
            onOpen={onOpen}
            onClear={() => setFilters({ ...DEFAULT_FILTERS, scope: 'everyone' })}
          />
        </>
      ) : (
        <CalendarView items={forCalendar} artists={directory.artists} conflicts={conflicts} onOpen={onOpen} />
      )}
    </>
  )
}
