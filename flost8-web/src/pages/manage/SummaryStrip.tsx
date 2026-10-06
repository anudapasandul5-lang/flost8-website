import { formatAmount } from '../../lib/manage/money'
import type { Summary } from '../../lib/manage/summaries'
import { FOCUS_RING, REASON_COLOR } from './styles'

export interface StripCard {
  managerId: string
  name: string
  artists: string
  summary: Summary
}

function Card({ card, selected, onSelect }: { card: StripCard; selected: boolean; onSelect?: () => void }) {
  const { summary: s } = card
  const calm = s.need === 0
  const body = (
    <>
      <span className="flex items-center justify-between gap-2 font-grotesk text-[13px] text-[var(--ink-72)]">
        <span className="text-[15px] font-medium text-ink">{card.name}</span>
        {selected ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11.5px] text-[var(--accent-ink)]">Showing {card.name}</span>
        ) : (
          <span className="truncate">{card.artists}</span>
        )}
      </span>
      <span className="my-1.5 flex items-baseline gap-2.5">
        <span
          className="font-display text-[62px] leading-[0.9]"
          style={{ color: calm || !s.top ? 'var(--ink-50)' : REASON_COLOR[s.top] }}
        >
          {s.need}
        </span>
        <span className="font-grotesk text-[15px] text-[var(--ink-72)]">{calm ? 'need you ✓' : 'need you'}</span>
      </span>
      <span className="flex flex-wrap gap-x-[18px] gap-y-1 font-grotesk text-[13px] text-[var(--ink-72)]">
        <span>
          <b className="font-medium text-ink">{s.booked} {s.booked === 1 ? 'show' : 'shows'}</b> booked ahead
        </span>
        <span>
          {s.owed.length === 0 ? (
            'Nothing owed'
          ) : (
            <>
              Owed <b className="font-medium text-ink">{s.owed.map((o) => formatAmount(o.amount, o.currency)).join(' · ')}</b>
            </>
          )}
        </span>
      </span>
    </>
  )
  const base = 'block w-full rounded-2xl border bg-[var(--bg-raise)] px-4 py-3.5 text-left'
  const edge = selected ? 'border-[var(--accent-line)] shadow-[inset_0_0_0_1px_var(--accent-line)]' : 'border-[var(--bg-line)]'
  return onSelect ? (
    <button type="button" aria-pressed={selected} onClick={onSelect} className={`${base} ${edge} transition hover:border-[var(--accent-line)] active:scale-[0.99] ${FOCUS_RING}`}>
      {body}
    </button>
  ) : (
    <div className={`${base} ${edge}`}>{body}</div>
  )
}

/** One card per manager for the owner (tap to filter the lists to that manager); one card for a manager themselves. */
export default function SummaryStrip({
  cards,
  selectedId,
  onSelect,
}: {
  cards: StripCard[]
  selectedId: string | null
  onSelect?: (managerId: string | null) => void
}) {
  if (cards.length === 0) return null
  return (
    <section aria-label="Summary" className={`mb-4 grid gap-3 ${cards.length > 1 ? 'md:grid-cols-2' : ''}`}>
      {cards.map((c) => (
        <Card
          key={c.managerId}
          card={c}
          selected={selectedId === c.managerId}
          onSelect={onSelect ? () => onSelect(selectedId === c.managerId ? null : c.managerId) : undefined}
        />
      ))}
    </section>
  )
}
