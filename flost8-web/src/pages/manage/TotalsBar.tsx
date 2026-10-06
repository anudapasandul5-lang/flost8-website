import type { CurrencyTotals } from '../../lib/manage/money'
import { PANEL } from './styles'

/** One block per currency; LKR and USD are never added together. */
export default function TotalsBar({ totals }: { totals: CurrencyTotals[] }) {
  if (totals.length === 0) return null
  return (
    <section aria-label="Money totals for this list" className="mb-5 grid gap-3 md:grid-cols-2">
      {totals.map((t) => (
        <div key={t.currency} className={`${PANEL} p-4`}>
          <p className="font-grotesk text-sm text-[var(--ink-72)]">
            {t.currency} totals ({t.count} {t.count === 1 ? 'inquiry' : 'inquiries'} with money details)
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-3">
            {(
              [
                ['Quoted', t.fee],
                ['Deposits', t.advance],
                ['Balance', t.balance],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="font-grotesk text-[13px] text-[var(--ink-50)]">{label}</dt>
                <dd className="mt-0.5 break-words font-grotesk text-[15px] font-medium tabular-nums text-ink md:text-lg">
                  {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  )
}
