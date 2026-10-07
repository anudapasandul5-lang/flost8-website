import { useMemo, useState } from 'react'
import { CaretLeft, CaretRight, Plus, Warning } from '@phosphor-icons/react'
import { formatDate, groupByDate, monthGrid, monthTitle, shiftMonth } from '../../lib/manage/calendar'
import { todayISO } from '../../lib/manage/filters'
import { artistNames, inquiryTitle } from '../../lib/manage/labels'
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from '../../lib/manage/status'
import type { Artist, Inquiry } from '../../lib/manage/types'
import { BTN_GHOST, FOCUS_RING } from './styles'
import { StatusBadge } from './ui'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarView({
  items,
  artists,
  conflicts,
  onOpen,
  onAddOnDate,
}: {
  items: Inquiry[]
  artists: Artist[]
  conflicts: ReadonlySet<string>
  onOpen: (id: string) => void
  /** Opens Add event on that day (YYYY-MM-DD). Omit when this person cannot add events. */
  onAddOnDate?: (date: string) => void
}) {
  const today = todayISO()
  const [ty, tm] = today.split('-').map(Number)
  const [{ year, month0 }, setMonth] = useState({ year: ty, month0: tm - 1 })
  const [picked, setPicked] = useState<string | null>(null)

  const byDate = useMemo(() => groupByDate(items), [items])
  const weeks = useMemo(() => monthGrid(year, month0), [year, month0])
  const agenda = picked ? (byDate.get(picked) ?? []) : []

  return (
    <section aria-label="Calendar">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous month" className={`${BTN_GHOST} !px-3`} onClick={() => setMonth((m) => shiftMonth(m.year, m.month0, -1))}>
            <CaretLeft size={20} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next month" className={`${BTN_GHOST} !px-3`} onClick={() => setMonth((m) => shiftMonth(m.year, m.month0, 1))}>
            <CaretRight size={20} aria-hidden="true" />
          </button>
        </div>
        <h2 className="font-display text-3xl text-ink md:text-4xl" aria-live="polite">
          {monthTitle(year, month0)}
        </h2>
        <button
          type="button"
          className={BTN_GHOST}
          onClick={() => {
            setMonth({ year: ty, month0: tm - 1 })
            setPicked(today)
          }}
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-line)]">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-base py-2 text-center font-grotesk text-[12px] font-medium text-[var(--ink-50)] md:text-sm">
            {d}
          </div>
        ))}
        {weeks.flat().map((c) => {
          const events = byDate.get(c.iso) ?? []
          const clash = events.some((e) => conflicts.has(e.id))
          const isPicked = picked === c.iso
          const label = `${formatDate(c.iso)}${events.length ? `, ${events.length} ${events.length === 1 ? 'inquiry' : 'inquiries'}` : ''}${clash ? ', possible double booking' : ''}`
          return (
            <div key={c.iso} className={`group relative ${c.inMonth ? 'bg-[var(--bg-raise)]' : 'bg-base'}`}>
            <button
              type="button"
              aria-label={label}
              aria-pressed={isPicked}
              onClick={() => setPicked(c.iso)}
              className={`relative flex h-full min-h-[64px] w-full flex-col items-stretch gap-1 p-1.5 text-left md:min-h-[104px] md:p-2 ${
                isPicked ? 'outline outline-2 -outline-offset-2 outline-[var(--accent-ink)]' : ''
              } ${FOCUS_RING}`}
            >
              <span
                className={`font-grotesk text-[13px] md:text-sm ${
                  c.iso === today ? 'font-bold text-[var(--accent-ink)]' : c.inMonth ? 'text-ink' : 'text-[var(--ink-32)]'
                }`}
              >
                {c.day}
              </span>
              {clash && <Warning size={14} weight="fill" aria-hidden="true" className="absolute right-1.5 top-1.5 text-[#FCD34D]" />}
              <span className="flex flex-wrap gap-1 md:hidden" aria-hidden="true">
                {events.slice(0, 4).map((e) => (
                  <span key={e.id} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[e.status].fg }} />
                ))}
              </span>
              <span className="hidden flex-col gap-1 md:flex" aria-hidden="true">
                {events.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    className="truncate rounded-md px-1.5 py-0.5 font-grotesk text-[12px] leading-tight"
                    style={{ color: STATUS_COLOR[e.status].fg, backgroundColor: STATUS_COLOR[e.status].bg }}
                  >
                    {inquiryTitle(e)}
                  </span>
                ))}
                {events.length > 2 && <span className="font-grotesk text-[12px] text-[var(--ink-50)]">+{events.length - 2} more</span>}
              </span>
            </button>
            {/* Desktop shortcut on a free day; the Add button under the grid does the same for touch and keyboard. */}
            {onAddOnDate && events.length === 0 && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Add event on ${formatDate(c.iso)}`}
                onClick={() => onAddOnDate(c.iso)}
                className={`absolute bottom-1 right-1 hidden h-11 w-11 place-items-center rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] text-ink opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none md:grid ${FOCUS_RING}`}
              >
                <Plus size={18} weight="bold" aria-hidden="true" />
              </button>
            )}
            </div>
          )
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1" aria-label="Colour key">
        {STATUS_ORDER.filter((s) => s !== 'spam').map((s) => (
          <li key={s} className="flex items-center gap-1.5 font-grotesk text-[13px] text-[var(--ink-72)]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[s].fg }} aria-hidden="true" />
            {STATUS_LABEL[s]}
          </li>
        ))}
        <li className="flex items-center gap-1.5 font-grotesk text-[13px] text-[var(--ink-72)]">
          <Warning size={14} weight="fill" className="text-[#FCD34D]" aria-hidden="true" />
          Double booked
        </li>
      </ul>

      <div className="mt-5" aria-live="polite">
        {picked ? (
          <>
            <h3 className="mb-2 font-grotesk text-[1.0625rem] font-medium text-ink">{formatDate(picked)}</h3>
            {agenda.length === 0 ? (
              <p className="font-grotesk text-sm text-[var(--ink-50)]">Nothing on this day.</p>
            ) : (
              <ul className="space-y-2">
                {agenda.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(e.id)}
                      className={`flex min-h-[64px] w-full items-center justify-between gap-3 rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] p-3 text-left hover:border-[var(--accent-line)] ${FOCUS_RING}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-grotesk text-[1.0625rem] font-medium text-ink">{inquiryTitle(e)}</span>
                        <span className="block truncate font-grotesk text-sm text-[var(--ink-72)]">{artistNames(e.artists, artists) || 'No artist yet'}</span>
                        {conflicts.has(e.id) && (
                          <span className="mt-0.5 inline-flex items-center gap-1 font-grotesk text-[13px] text-[#FCD34D]">
                            <Warning size={14} weight="fill" aria-hidden="true" />
                            Another confirmed booking has the same artist on this date
                          </span>
                        )}
                      </span>
                      <StatusBadge status={e.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {onAddOnDate && (
              <button type="button" onClick={() => onAddOnDate(picked)} className={`${BTN_GHOST} mt-3`}>
                <Plus size={18} weight="bold" aria-hidden="true" />
                Add event on {formatDate(picked)}
              </button>
            )}
          </>
        ) : (
          <p className="font-grotesk text-sm text-[var(--ink-50)]">Tap a day to see what is on it.</p>
        )}
      </div>
    </section>
  )
}
