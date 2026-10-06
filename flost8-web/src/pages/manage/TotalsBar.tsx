import type { CurrencyTotals } from '../../lib/manage/money'
import { PANEL } from './styles'

const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)

/** One slim line: the list count, then one money group per currency. LKR and USD are never added together. */
export default function TotalsBar({ count, totals }: { count: number; totals: CurrencyTotals[] }) {
  return (
    <section aria-label="Totals for this list" className={`${PANEL} mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 px-4 py-3`}>
      <p aria-live="polite" className="font-grotesk text-sm font-medium text-ink">
        {count} {count === 1 ? 'inquiry' : 'inquiries'}
      </p>
      {totals.map((t) => (
        <div key={t.currency} className="flex flex-wrap items-baseline gap-x-5 gap-y-1" title={`${t.count} with money details`}>
          <span className="font-grotesk text-[13px] text-[var(--ink-50)]">{t.currency}</span>
          <dl className="contents">
          {(
            [
              ['Quoted', t.fee],
              ['Deposits', t.advance],
              ['Balance', t.balance],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <dt className="font-grotesk text-[13px] text-[var(--ink-50)]">{label}</dt>
              <dd className="font-grotesk text-[15px] font-medium tabular-nums text-ink">{fmt(value)}</dd>
            </div>
          ))}
          </dl>
        </div>
      ))}
    </section>
  )
}
