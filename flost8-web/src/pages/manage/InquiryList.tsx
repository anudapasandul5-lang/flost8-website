import { Warning } from '@phosphor-icons/react'
import { formatDate } from '../../lib/manage/calendar'
import { artistNames, inquiryTitle } from '../../lib/manage/labels'
import { formatAmount } from '../../lib/manage/money'
import type { Artist, Inquiry } from '../../lib/manage/types'
import { BTN_GHOST, FOCUS_RING } from './styles'
import { StatusBadge } from './ui'

const MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const THIS_YEAR = new Date().getFullYear()

function DateBlock({ date }: { date: string | null }) {
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
      className={`flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-xl text-center ${y === THIS_YEAR ? 'bg-[var(--accent-soft)]' : 'border border-[#FCD34D]/50 bg-[#FCD34D]/10'}`}
      aria-label={formatDate(date)}
    >
      <span className="font-display text-2xl leading-none text-ink">{d}</span>
      <span className={`font-grotesk text-[11px] font-medium tracking-wide ${y === THIS_YEAR ? 'text-[var(--accent-ink)]' : 'text-[#FCD34D]'}`}>
        {MON3[m - 1]} {y}
      </span>
    </div>
  )
}

export default function InquiryList({
  items,
  artists,
  conflicts,
  onOpen,
  onClear,
}: {
  items: Inquiry[]
  artists: Artist[]
  conflicts: ReadonlySet<string>
  onOpen: (id: string) => void
  onClear: () => void
}) {
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
    <ul className="space-y-2">
      {items.map((i, n) => {
        const year = i.event_date?.slice(0, 4)
        const prev = n > 0 ? items[n - 1].event_date?.slice(0, 4) : undefined
        const place = [i.venue, i.city].filter(Boolean).join(', ')
        const fee = i.money?.fee
        return (
          <li key={i.id}>
            {year && year !== prev && (
              <h3 className={`mb-2 font-display text-2xl leading-none ${n > 0 ? 'mt-5' : ''} ${Number(year) === THIS_YEAR ? 'text-ink' : 'text-[#FCD34D]'}`}>{year}</h3>
            )}
            <button
              type="button"
              onClick={() => onOpen(i.id)}
              className={`flex min-h-[72px] w-full items-center gap-4 rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] p-3 text-left transition hover:border-[var(--accent-line)] active:scale-[0.99] ${FOCUS_RING}`}
            >
              <DateBlock date={i.event_date} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-grotesk text-[1.0625rem] font-medium text-ink">{inquiryTitle(i)}</p>
                <p className="truncate font-grotesk text-sm text-[var(--ink-72)]">{artistNames(i.artists, artists) || 'No artist yet'}</p>
                {place && <p className="truncate font-grotesk text-[13px] text-[var(--ink-50)]">{place}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <StatusBadge status={i.status} />
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
          </li>
        )
      })}
    </ul>
  )
}
