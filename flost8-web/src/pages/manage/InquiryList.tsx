import { useState } from 'react'
import { CaretDown, CaretRight, Warning } from '@phosphor-icons/react'
import { formatDate } from '../../lib/manage/calendar'
import { artistNames, inquiryTitle } from '../../lib/manage/labels'
import { groupInquiries, type MonthGroup } from '../../lib/manage/listGroups'
import { formatAmount } from '../../lib/manage/money'
import { isSnoozed, snoozedLabel } from '../../lib/manage/snooze'
import { canSetStatus } from '../../lib/manage/rowActions'
import type { Artist, Inquiry, Manager, Status } from '../../lib/manage/types'
import { commonRowItems, type RowActions } from '../../lib/manage/rowMenu'
import RowMenu from './RowMenu'
import { BTN_GHOST, FOCUS_RING } from './styles'
import { StatusBadge } from './ui'

const MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']


function DateBlock({ date, thisYear }: { date: string | null; thisYear: number }) {
  if (!date)
    return (
      <div className="flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--bg-line)] text-center font-grotesk text-[11px] leading-tight text-[var(--ink-50)]">
        No
        <br />
        date
      </div>
    )
  const [y, m, d] = date.split('-').map(Number)
  return (
    <div
      className={`flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-xl text-center ${y === thisYear ? 'bg-[var(--accent-soft)]' : 'border border-[#FCD34D]/50 bg-[#FCD34D]/10'}`}
      aria-label={formatDate(date)}
    >
      <span className="font-display text-2xl leading-none text-ink">{d}</span>
      <span className={`font-grotesk text-[11px] font-medium tracking-wide ${y === thisYear ? 'text-[var(--accent-ink)]' : 'text-[#FCD34D]'}`}>
        {MON3[m - 1]} {y}
      </span>
    </div>
  )
}

export default function InquiryList({
  items,
  artists,
  conflicts,
  today,
  onOpen,
  onClear,
  me,
  managers,
  onDuplicate,
  onSetStatus,
  onSnooze,
  onBulkStatus,
}: {
  items: Inquiry[]
  artists: Artist[]
  me: Manager
  managers: Manager[]
  onDuplicate: (i: Inquiry) => void
  onSetStatus: (i: Inquiry, status: Status) => void
  onSnooze: (i: Inquiry, until: string | null) => void
  /** Called with the ticked rows; each one is updated on its own and the result reported. */
  onBulkStatus: (ids: string[], status: 'lost' | 'spam') => void
  conflicts: ReadonlySet<string>
  /** YYYY-MM-DD, kept current by the caller (useToday). */
  today: string
  onOpen: (id: string) => void
  onClear: () => void
}) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const actions: RowActions = { onDuplicate, onSetStatus, onSnooze, today }
  // Ticks for rows that have left the list (a filter changed) must not be acted on.
  const ticked = items.filter((i) => picked.has(i.id) && canSetStatus(i, me)).map((i) => i.id)
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p)
      if (!n.delete(id)) n.add(id)
      return n
    })
  const bulk = (status: 'lost' | 'spam') => {
    onBulkStatus(ticked, status)
    setPicked(new Set())
  }

  if (items.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-[var(--bg-line)] p-8 text-center">
        <p className="font-grotesk text-[1.0625rem] text-ink">Nothing matches these filters.</p>
        <p className="mt-1 font-grotesk text-sm text-[var(--ink-50)]">Try Everyone&apos;s, a different status, or clear the search.</p>
        <button type="button" onClick={onClear} className={`${BTN_GHOST} mt-4`}>
          Show everyone&apos;s inquiries
        </button>
      </div>
    )

  const thisYear = today.slice(0, 4)
  const groups = groupInquiries(items, today)
  // Upcoming months and the first month on the list start open; older past months start folded.
  const isOpen = (g: MonthGroup, idx: number) => expanded[g.key] ?? (g.side === 'upcoming' || idx === 0)
  const SIDE_LABEL = { upcoming: 'Upcoming', past: 'Past', undated: 'No date yet' } as const

  const badges = (i: Inquiry) => (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <StatusBadge status={i.status} />
      {isSnoozed(i, today) && <span className="font-grotesk text-[12px] text-[var(--ink-50)]">{snoozedLabel(i.snoozed_until!, today)}</span>}
      {i.source === 'manual' && (
        <span className="hidden rounded-full border border-[var(--accent-line)] px-2 py-0.5 font-grotesk text-[11.5px] text-[var(--accent-ink)] sm:inline">Added in app</span>
      )}
      {conflicts.has(i.id) && (
        <span className="inline-flex items-center gap-1 font-grotesk text-[12px] text-[#FCD34D]">
          <Warning size={14} weight="fill" aria-hidden="true" />
          Double booked
        </span>
      )}
      {i.money && i.money.fee !== null && i.money.fee !== undefined && (
        <span className="font-grotesk text-[13px] tabular-nums text-[var(--ink-72)]">{formatAmount(i.money.fee, i.money.currency)}</span>
      )}
    </div>
  )

  const checkbox = (i: Inquiry, label: string) =>
    canSetStatus(i, me) ? (
      <label className="grid h-12 w-11 shrink-0 cursor-pointer place-items-center pl-1">
        <input type="checkbox" checked={picked.has(i.id)} onChange={() => toggle(i.id)} aria-label={`Select ${label}`} className="h-5 w-5 accent-[#9D14FF]" />
      </label>
    ) : (
      <span aria-hidden="true" className="w-3 shrink-0" />
    )

  const menu = (i: Inquiry) => <RowMenu items={[...commonRowItems(i, me, managers, actions), { label: 'Open details', onClick: () => onOpen(i.id) }]} />
  const placeOf = (i: Inquiry) => [i.venue, i.city].filter(Boolean).join(', ')
  const CARD = 'rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] transition hover:border-[var(--accent-line)]'

  return (
    <>
      <div className="space-y-3">
        {groups.map((g, idx) => {
          const open = isOpen(g, idx)
          const otherYear = g.side !== 'undated' && !g.key.includes(`-${thisYear}-`)
          const sideHeading = g.side !== groups[idx - 1]?.side
          return (
            <section key={g.key} aria-label={`${g.label}, ${g.side}`}>
              {sideHeading && (
                <h3 className={`mb-2 font-grotesk text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--ink-50)] ${idx > 0 ? 'mt-6' : ''}`}>{SIDE_LABEL[g.side]}</h3>
              )}
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setExpanded((e) => ({ ...e, [g.key]: !open }))}
                className={`flex w-full items-center gap-2 rounded-xl border border-[var(--bg-line)] bg-[var(--bg-raise)]/60 px-3 py-2.5 text-left ${FOCUS_RING}`}
              >
                {open ? (
                  <CaretDown size={16} aria-hidden="true" className="shrink-0 text-[var(--ink-50)]" />
                ) : (
                  <CaretRight size={16} aria-hidden="true" className="shrink-0 text-[var(--ink-50)]" />
                )}
                <span className={`font-display text-xl leading-none ${otherYear ? 'text-[#FCD34D]' : 'text-ink'}`}>{g.label}</span>
                <span className="font-grotesk text-sm text-[var(--ink-72)]">
                  {g.showCount} {g.showCount === 1 ? 'show' : 'shows'}
                  {g.fee && (
                    <>
                      {' · '}
                      <span className="tabular-nums">{formatAmount(g.fee.total, g.fee.currency)}</span>
                    </>
                  )}
                </span>
              </button>
              {open && (
                <ul className="mt-2 space-y-2">
                  {g.shows.map((s) => {
                    const first = s.items[0]
                    if (s.items.length === 1)
                      return (
                        <li key={s.key}>
                          <div className={`flex items-center gap-1 pr-2 ${CARD}`}>
                            {checkbox(first, inquiryTitle(first))}
                            <button
                              type="button"
                              data-row-id={first.id}
                              onClick={() => onOpen(first.id)}
                              className={`flex min-h-[72px] min-w-0 flex-1 items-center gap-3 rounded-2xl py-3 pr-1 text-left active:scale-[0.99] ${FOCUS_RING}`}
                            >
                              <DateBlock date={first.event_date} thisYear={Number(thisYear)} />
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 break-words font-grotesk text-[1.0625rem] font-medium leading-snug text-ink">{inquiryTitle(first)}</p>
                                <p className="truncate font-grotesk text-sm text-[var(--ink-72)]">{artistNames(first.artists, artists) || 'No artist yet'}</p>
                                {placeOf(first) && <p className="truncate font-grotesk text-[13px] text-[var(--ink-50)]">{placeOf(first)}</p>}
                              </div>
                              {badges(first)}
                            </button>
                            {menu(first)}
                          </div>
                        </li>
                      )
                    // Joint show: one card, a tappable line per artist so every row keeps its own status, fee and menu.
                    return (
                      <li key={s.key}>
                        <div className={`${CARD} pb-1`}>
                          <div className="flex items-center gap-3 px-3 pb-2 pt-3">
                            <DateBlock date={first.event_date} thisYear={Number(thisYear)} />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 break-words font-grotesk text-[1.0625rem] font-medium leading-snug text-ink">{inquiryTitle(first)}</p>
                              {placeOf(first) && <p className="truncate font-grotesk text-[13px] text-[var(--ink-50)]">{placeOf(first)}</p>}
                            </div>
                          </div>
                          <ul className="divide-y divide-[var(--bg-line)] border-t border-[var(--bg-line)]">
                            {s.items.map((i) => (
                              <li key={i.id} className="flex items-center gap-1 pr-2">
                                {checkbox(i, `${inquiryTitle(i)}, ${artistNames(i.artists, artists) || 'no artist'}`)}
                                <button
                                  type="button"
                                  data-row-id={i.id}
                                  onClick={() => onOpen(i.id)}
                                  className={`flex min-h-[56px] min-w-0 flex-1 items-center gap-3 rounded-xl py-2 pr-1 text-left ${FOCUS_RING}`}
                                >
                                  <p className="min-w-0 flex-1 truncate font-grotesk text-[1rem] text-ink">{artistNames(i.artists, artists) || 'No artist yet'}</p>
                                  {badges(i)}
                                </button>
                                {menu(i)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    {ticked.length > 0 && (
      <div role="region" aria-label="Selected inquiries" className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--accent-line)] bg-[#241433] p-2 pl-4 shadow-[0_8px_30px_rgba(10,4,14,0.6)] lg:bottom-4">
        <span className="mr-auto font-grotesk text-[15px] text-ink" aria-live="polite">{ticked.length} selected</span>
        <button type="button" onClick={() => bulk('lost')} className={BTN_GHOST}>Mark lost</button>
        <button type="button" onClick={() => bulk('spam')} className={BTN_GHOST}>Mark spam</button>
        <button type="button" onClick={() => setPicked(new Set())} className={BTN_GHOST}>Clear</button>
      </div>
    )}
    </>
  )
}
