import { useCallback, useMemo, useState } from 'react'
import { CalendarBlank, ListBullets, SignOut } from '@phosphor-icons/react'
import { fetchDirectory, fetchInquiries } from '../../lib/manage/api'
import { conflictIds } from '../../lib/manage/conflicts'
import { applyFilters, DEFAULT_FILTERS, todayISO, type Filters } from '../../lib/manage/filters'
import { signOut, useLoad } from '../../lib/manage/hooks'
import { totalsByCurrency } from '../../lib/manage/money'
import type { Artist, Inquiry, Manager } from '../../lib/manage/types'
import CalendarView from './CalendarView'
import FilterBar from './FilterBar'
import InquiryDrawer from './InquiryDrawer'
import InquiryList from './InquiryList'
import TotalsBar from './TotalsBar'
import { BTN_GHOST, CHIP_BASE, CHIP_OFF, CHIP_ON } from './styles'
import { ErrorPanel, Skeleton, Toast, type ToastMsg } from './ui'

export interface Directory {
  managers: Manager[]
  artists: Artist[]
}

/** Loads everything the signed-in manager can see, then hands it to the dashboard. */
export default function Workspace({ me }: { me: Manager }) {
  const loadDir = useCallback(() => fetchDirectory(), [])
  const loadInq = useCallback(() => fetchInquiries(), [])
  const dir = useLoad(loadDir)
  const inq = useLoad(loadInq)

  const body =
    dir.state.status === 'error' || inq.state.status === 'error' ? (
      <ErrorPanel
        message={dir.state.status === 'error' ? dir.state.message : inq.state.status === 'error' ? inq.state.message : ''}
        onRetry={() => {
          dir.retry()
          inq.retry()
        }}
      />
    ) : dir.state.status === 'loading' || inq.state.status === 'loading' ? (
      <Skeleton />
    ) : (
      <Dashboard me={me} directory={dir.state.data} inquiries={inq.state.data} reload={inq.refresh} />
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
  reload,
}: {
  me: Manager
  directory: Directory
  inquiries: Inquiry[]
  reload: () => void
}) {
  const mySlugs = useMemo(
    () => new Set(directory.artists.filter((a) => a.manager_id === me.id).map((a) => a.slug)),
    [directory.artists, me.id],
  )
  // Someone who looks after no artists (the owner) would see an empty "My artists" list.
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    scope: mySlugs.size === 0 ? 'everyone' : 'mine',
  }))
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [openId, setOpenId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const ctx = useMemo(() => ({ mySlugs, today: todayISO() }), [mySlugs])
  const filtered = useMemo(() => applyFilters(inquiries, filters, ctx), [inquiries, filters, ctx])
  const forCalendar = useMemo(() => applyFilters(inquiries, filters, ctx, { ignoreTimeframe: true }), [inquiries, filters, ctx])
  const totals = useMemo(() => totalsByCurrency(filtered), [filtered])
  const conflicts = useMemo(() => conflictIds(inquiries), [inquiries])
  const open = inquiries.find((i) => i.id === openId) ?? null

  const viewBtn = (v: 'list' | 'calendar', label: string, icon: React.ReactNode) => (
    <button
      type="button"
      aria-pressed={view === v}
      onClick={() => setView(v)}
      className={`${CHIP_BASE} gap-2 ${view === v ? CHIP_ON : CHIP_OFF}`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        artists={directory.artists}
        hideTimeframe={view === 'calendar'}
        noOwnArtists={mySlugs.size === 0}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-grotesk text-sm text-[var(--ink-72)]" aria-live="polite">
          {view === 'list'
            ? `${filtered.length} ${filtered.length === 1 ? 'inquiry' : 'inquiries'}`
            : `${forCalendar.filter((i) => i.event_date).length} dated`}
        </p>
        <div className="flex gap-2">
          {viewBtn('list', 'List', <ListBullets size={18} aria-hidden="true" />)}
          {viewBtn('calendar', 'Calendar', <CalendarBlank size={18} aria-hidden="true" />)}
        </div>
      </div>

      {view === 'list' ? (
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
    </>
  )
}
