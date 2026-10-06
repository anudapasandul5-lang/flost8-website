import { useState, type ReactNode } from 'react'
import { BellRinging, CalendarBlank, ListBullets, Plus, SignOut, SquaresFour, X } from '@phosphor-icons/react'
import { signOut } from '../../lib/manage/hooks'
import type { Reason } from '../../lib/manage/needsAction'
import type { Manager } from '../../lib/manage/types'
import { BTN_GHOST, FOCUS_RING, REASON_COLOR } from './styles'

export type View = 'overview' | 'needs' | 'all' | 'calendar'

/** One manager in the sidebar's Team list (owner only). `top` colours the dot; no dot when nothing is open. */
export interface TeamItem {
  id: string
  name: string
  open: number
  top: Reason | null
}

export interface ShellState {
  view: View
  setView: (v: View) => void
  /** Owner taps a manager to look at just that manager's rows. */
  managerFilter: string | null
  setManagerFilter: (id: string | null) => void
}

export interface ShellProps {
  me: Manager
  /** Owner only; pass [] for a manager. */
  team: TeamItem[]
  /** Items still waiting for everyone (not narrowed by the manager filter). */
  needCount: number
  totalCount: number
  /** Omit when this person cannot add events. */
  onAdd?: () => void
  children: (s: ShellState) => ReactNode
}

const MAX_W = 'max-w-[1440px]'

/** Sidebar from 1024px up, bottom tab bar below. Owns which view is open and the manager filter. */
export default function Shell({ me, team, needCount, totalCount, onAdd, children }: ShellProps) {
  const [view, setView] = useState<View>('overview')
  const [managerFilter, setManagerFilter] = useState<string | null>(null)
  const owner = me.role === 'owner'
  const needsLabel = owner ? 'Team follow-ups' : 'Needs you'
  const filterName = team.find((t) => t.id === managerFilter)?.name

  const items: { id: View; label: string; short: string; Icon: typeof SquaresFour; count?: number }[] = [
    { id: 'overview', label: 'Overview', short: 'Overview', Icon: SquaresFour },
    { id: 'needs', label: needsLabel, short: owner ? 'Follow-ups' : 'Needs you', Icon: BellRinging, count: needCount },
    { id: 'all', label: 'All inquiries', short: 'All', Icon: ListBullets, count: totalCount },
    { id: 'calendar', label: 'Calendar', short: 'Calendar', Icon: CalendarBlank },
  ]
  const title = items.find((i) => i.id === view)!.label

  const navBtn = (on: boolean) =>
    `flex h-11 w-full items-center justify-between rounded-xl px-3 text-left font-grotesk text-[14.5px] transition ${
      on ? 'bg-accent font-medium text-ink' : 'text-[var(--ink-72)] hover:bg-white/5'
    } ${FOCUS_RING}`
  const badge = (on: boolean) =>
    `grid h-5 min-w-[22px] place-items-center rounded-full px-1.5 text-[12px] font-semibold ${on ? 'bg-black/25' : 'bg-white/10'}`

  return (
    <div className="min-h-[100dvh] bg-base">
      <div className={`mx-auto min-h-[100dvh] ${MAX_W} lg:grid lg:grid-cols-[232px_minmax(0,1fr)]`}>
        <aside className="sticky top-0 hidden h-[100dvh] flex-col gap-1.5 overflow-y-auto border-r border-[var(--bg-line)] px-4 py-6 lg:flex">
          <p className="px-2 pb-2 font-display text-[28px] leading-none tracking-[0.08em] text-ink">
            FLO<span className="text-[var(--accent-ink)]">ST8</span>
          </p>
          <div className="mb-2 flex items-center gap-2.5 px-2 py-1.5">
            <i className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#9D14FF] to-[#3B0764] text-[13px] font-semibold not-italic text-ink" aria-hidden="true">
              {me.name.charAt(0)}
            </i>
            <p className="min-w-0 font-grotesk text-[14px] text-ink">
              <span className="block truncate">{me.name}</span>
              <small className="text-[12px] capitalize text-[var(--ink-50)]">{me.role}</small>
            </p>
          </div>
          <nav aria-label="Views" className="space-y-1">
            <p className="px-2.5 pb-1 pt-3 font-grotesk text-[11px] tracking-[0.12em] text-[var(--ink-50)]">WORK</p>
            {items.map((it) => (
              <button key={it.id} type="button" aria-current={view === it.id ? 'page' : undefined} onClick={() => setView(it.id)} className={navBtn(view === it.id)}>
                {it.label}
                {it.count ? <span className={badge(view === it.id)}>{it.count}</span> : null}
              </button>
            ))}
          </nav>
          {team.length > 0 && (
            <div className="space-y-1">
              <p className="px-2.5 pb-1 pt-4 font-grotesk text-[11px] tracking-[0.12em] text-[var(--ink-50)]">TEAM</p>
              <button type="button" aria-pressed={managerFilter === null} onClick={() => setManagerFilter(null)} className={navBtn(managerFilter === null)}>
                Everyone
              </button>
              {team.map((t) => (
                <button key={t.id} type="button" aria-pressed={managerFilter === t.id} onClick={() => setManagerFilter(managerFilter === t.id ? null : t.id)} className={navBtn(managerFilter === t.id)}>
                  {t.name}
                  {t.open > 0 && t.top && (
                    <span className="h-2 w-2 rounded-full" style={{ background: REASON_COLOR[t.top] }}>
                      <span className="sr-only">{t.open} open</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="mt-auto space-y-2 pt-4">
            {onAdd && (
              <button type="button" onClick={onAdd} className={`flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] font-grotesk text-[14.5px] font-medium text-ink ${FOCUS_RING}`}>
                <Plus size={16} weight="bold" aria-hidden="true" />
                Add event
              </button>
            )}
            <button type="button" onClick={() => void signOut()} className={`${BTN_GHOST} w-full`}>
              <SignOut size={18} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 px-4 pb-28 pt-5 outline-none md:px-8 md:pt-8 lg:pb-12">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <p className="min-w-0 truncate font-grotesk text-sm text-[var(--ink-50)]">Signed in as {me.name}</p>
            <button type="button" onClick={() => void signOut()} className={BTN_GHOST}>
              <SignOut size={18} aria-hidden="true" />
              Sign out
            </button>
          </div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-5xl leading-none text-ink md:text-6xl">{title}</h1>
            <div className="flex items-center gap-2">
              {filterName && (
                <button type="button" onClick={() => setManagerFilter(null)} className={`${BTN_GHOST} border-[var(--accent-line)] bg-[var(--accent-soft)] text-ink`}>
                  Showing {filterName}
                  <X size={14} weight="bold" aria-label="Clear filter" />
                </button>
              )}
              {onAdd && (
                <button type="button" onClick={onAdd} className={`${BTN_GHOST} lg:hidden`}>
                  <Plus size={18} weight="bold" aria-hidden="true" />
                  Add event
                </button>
              )}
            </div>
          </div>
          {children({ view, setView, managerFilter, setManagerFilter })}
        </main>

        <nav aria-label="Views" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[var(--bg-line)] bg-[#120917]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {items.map((it) => {
            const on = view === it.id
            return (
              <button
                key={it.id}
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => setView(it.id)}
                className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 font-grotesk text-[12px] ${on ? 'text-ink' : 'text-[var(--ink-72)]'} ${FOCUS_RING}`}
              >
                <it.Icon size={22} weight={on ? 'fill' : 'regular'} aria-hidden="true" className={on ? 'text-[var(--accent-ink)]' : ''} />
                {it.short}
                {it.id === 'needs' && it.count ? (
                  <b className="absolute right-[22%] top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-ink">{it.count}</b>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
