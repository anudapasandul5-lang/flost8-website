import type { Currency, Inquiry, Money } from './types'

export function formatAmount(n: number | null | undefined, currency: Currency): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '-'
  return `${currency} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)}`
}

export interface CurrencyTotals {
  currency: Currency
  /** How many inquiries contributed (those whose money the database showed us). */
  count: number
  fee: number
  advance: number
  balance: number
}

/** One bucket per currency, never mixed. Rows without a visible money record are skipped. */
export function totalsByCurrency(list: Inquiry[]): CurrencyTotals[] {
  const buckets = new Map<Currency, CurrencyTotals>()
  for (const i of list) {
    const m = i.money
    if (!m) continue
    let b = buckets.get(m.currency)
    if (!b) {
      b = { currency: m.currency, count: 0, fee: 0, advance: 0, balance: 0 }
      buckets.set(m.currency, b)
    }
    b.count += 1
    b.fee += m.fee ?? 0
    b.advance += m.advance ?? 0
    b.balance += m.balance ?? 0
  }
  return (['LKR', 'USD'] as Currency[]).flatMap((c) => buckets.get(c) ?? [])
}

/** '' -> null, '1,500' -> 1500, junk -> undefined (caller shows an error). */
export function parseAmountInput(raw: string): number | null | undefined {
  const t = raw.trim().replace(/,/g, '')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

/** The money row after the balance is settled: the deposit becomes the full amount and nothing is owed. null when nothing is owed. */
export function paidInFull(m: Money): Money | null {
  const owed = m.balance ?? 0
  if (owed <= 0) return null
  return { ...m, advance: m.fee ?? (m.advance ?? 0) + owed, balance: 0, balance_note: null }
}
