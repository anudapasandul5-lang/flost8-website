import { useState } from 'react'
import { Warning } from '@phosphor-icons/react'
import { formatDate } from '../../lib/manage/calendar'
import { artistNames, inquiryTitle } from '../../lib/manage/labels'
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

  return (
    <>
    <ul className="space-y-2">
      {items.map((i, n) => {
        // Upcoming years come first, then past ones; a section label changes when the year or the upcoming/past side changes.
        const section = (x: Inquiry | undefined) => (x?.event_date ? `${x.event_date < today ? 'Past · ' : ''}${x.event_date.slice(0, 4)}` : undefined)
        const year = section(i)
        const prev = n > 0 ? section(items[n - 1]) : undefined
        const place = [i.venue, i.city].filter(Boolean).join(', ')
        const fee = i.money?.fee
        const selectable = canSetStatus(i, me)
        return (
          <li key={i.id}>
            {year && year !== prev && (
              <h3 className={`mb-2 font-display text-2xl leading-none ${n > 0 ? 'mt-5' : ''} ${year.endsWith(today.slice(0, 4)) ? 'text-ink' : 'text-[#FCD34D]'}`}>{year}</h3>
            )}
            <div className="flex items-center gap-1 rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] pr-2 transition hover:border-[var(--accent-line)]">
              {selectable ? (
                <label className="grid h-12 w-11 shrink-0 cursor-pointer place-items-center pl-1">
                  <input
                    type="checkbox"
                    checked={picked.has(i.id)}
                    onChange={() => toggle(i.id)}
                    aria-label={`Select ${inquiryTitle(i)}`}
                    className="h-5 w-5 accent-[#9D14FF]"
                  />
                </label>
              ) : (
                <span aria-hidden="true" className="w-3 shrink-0" />
              )}
            <button
              type="button"
              data-row-id={i.id}
              onClick={() => onOpen(i.id)}
              className={`flex min-h-[72px] min-w-0 flex-1 items-center gap-3 rounded-2xl py-3 pr-1 text-left active:scale-[0.99] ${FOCUS_RING}`}
            >
              <DateBlock date={i.event_date} thisYear={Number(today.slice(0, 4))} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-grotesk text-[1.0625rem] font-medium text-ink">{inquiryTitle(i)}</p>
                <p className="truncate font-grotesk text-sm text-[var(--ink-72)]">{artistNames(i.artists, artists) || 'No artist yet'}</p>
                {place && <p className="truncate font-grotesk text-[13px] text-[var(--ink-50)]">{place}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <StatusBadge status={i.status} />
                {isSnoozed(i, today) && <span className="font-grotesk text-[12px] text-[var(--ink-50)]">{snoozedLabel(i.snoozed_until!, today)}</span>}
                {i.source === 'manual' && (
                  <span className="rounded-full border border-[var(--accent-line)] px-2 py-0.5 font-grotesk text-[11.5px] text-[var(--accent-ink)]">Added in app</span>
                )}
                {conflicts.has(i.id) && (
                  <span className="inline-flex items-center gap-1 font-grotesk text-[12px] text-[#FCD34D]">
                    <Warning size={14} weight="fill" aria-hidden="true" />
                    Double booked
                  </span>
                )}
                {i.money && fee !== null && fee !== undefined && (
                  <span className="font-grotesk text-[13px] tabular-nums text-[var(--ink-72)]">{formatAmount(fee, i.money.currency)}</span>
                )}
              </div>
            </button>
              <RowMenu items={[...commonRowItems(i, me, managers, actions), { label: 'Open details', onClick: () => onOpen(i.id) }]} />
            </div>
          </li>
        )
      })}
    </ul>
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
