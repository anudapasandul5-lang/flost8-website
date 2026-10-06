import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SignOut } from '@phosphor-icons/react'
import { addComment, fetchDirectory, fetchInquiries, fetchLastTouch, friendlyError, saveMoney, updateInquiry } from '../../lib/manage/api'
import { conflictIds } from '../../lib/manage/conflicts'
import { applyFilters, DEFAULT_FILTERS, todayISO, type Filters } from '../../lib/manage/filters'
import { signOut, useLoad } from '../../lib/manage/hooks'
import { inquiryTitle } from '../../lib/manage/labels'
import { formatAmount, totalsByCurrency } from '../../lib/manage/money'
import { needsAction, nextBookedShow, REASON_RANK } from '../../lib/manage/needsAction'
import type { Artist, Inquiry, Manager } from '../../lib/manage/types'
import CalendarView from './CalendarView'
import FilterBar from './FilterBar'
import InquiryDrawer from './InquiryDrawer'
import InquiryList from './InquiryList'
import NeedsList, { type AdvanceKind, type NeedsRow } from './NeedsList'
import TotalsBar from './TotalsBar'
import { BTN_GHOST } from './styles'
import { ErrorPanel, Skeleton, Toast, UndoToast, type ToastMsg } from './ui'

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
    dir.state.status === 'error' || inq.state.status === 'error' || touch.state.status === 'error' ? (
      <ErrorPanel
        message={
          dir.state.status === 'error'
            ? dir.state.message
            : inq.state.status === 'error'
              ? inq.state.message
              : touch.state.status === 'error'
                ? touch.state.message
                : ''
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
      <Dashboard me={me} directory={dir.state.data} inquiries={inq.state.data} lastTouch={touch.state.data} reload={reload} />
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
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const ctx = useMemo(() => ({ mySlugs, today: todayISO() }), [mySlugs])
  const filtered = useMemo(() => applyFilters(inquiries, filters, ctx), [inquiries, filters, ctx])
  const forCalendar = useMemo(() => applyFilters(inquiries, filters, ctx, { ignoreTimeframe: true }), [inquiries, filters, ctx])
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
  const needsRows = useMemo(() => needsAll.filter((r) => !hidden.has(r.inquiry.id)), [needsAll, hidden])
  const nextShow = useMemo(
    () => nextBookedShow(inquiries.filter((i) => me.role === 'owner' || i.owner_id === me.id), ctx.today),
    [inquiries, me.id, me.role, ctx.today],
  )

  // Fresh data already reflects any finished write, so stop hiding those cards (but keep the one still waiting).
  useEffect(() => {
    setHidden(new Set(pending.current ? [pending.current.id] : []))
  }, [inquiries, lastTouch])

  const flush = useCallback(async () => {
    const p = pending.current
    if (!p) return
    pending.current = null
    window.clearTimeout(p.timer)
    setUndoText(null)
    try {
      await p.run()
      reload()
    } catch (err) {
      setHidden((h) => {
        const n = new Set(h)
        n.delete(p.id)
        return n
      })
      setToast({ kind: 'error', text: friendlyError(err) })
    }
  }, [reload])

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
    setHidden((h) => {
      const n = new Set(h)
      n.delete(p.id)
      return n
    })
  }

  const onChased = (i: Inquiry) =>
    schedule(i.id, `Marked chased · ${inquiryTitle(i)}`, () => addComment(i.id, me.id, 'Chased today'))

  const onAdvance = (i: Inquiry, kind: AdvanceKind) => {
    if (kind === 'reached_out')
      return schedule(i.id, `Marked reached out · ${inquiryTitle(i)}`, () => updateInquiry(i.id, { status: 'reached_out' }))
    const m = i.money
    if (!m || !m.balance) return
    schedule(i.id, `Marked paid · ${inquiryTitle(i)}`, async () => {
      await saveMoney(i.id, { ...m, balance: 0 })
      await addComment(i.id, me.id, `Balance paid (was ${formatAmount(m.balance, m.currency)})`)
    })
  }

  const tabs: { id: typeof view; label: string }[] = [
    { id: 'needs', label: 'Needs you' },
    { id: 'all', label: 'All' },
    { id: 'calendar', label: 'Calendar' },
  ]

  return (
    <>
      <div role="tablist" aria-label="View" className="mb-5 flex gap-1 rounded-full border border-[var(--bg-line)] bg-[var(--bg-raise)] p-1 md:max-w-[460px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={view === t.id}
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
                <span className="ml-1.5" aria-label="nothing waiting">
                  ✓
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
      <Toast toast={toast} onDone={clearToast} />
      {undoText && <UndoToast text={undoText} onUndo={undo} />}
    </>
  )
}
