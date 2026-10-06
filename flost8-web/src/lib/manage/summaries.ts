import { REASON_RANK, type Reason } from './needsAction'
import type { Currency, Inquiry } from './types'

export interface Summary {
  need: number
  /** Most urgent reason in this manager's list; colours the big number. Null = nothing waiting. */
  top: Reason | null
  /** Upcoming booked or deposit-paid shows. */
  booked: number
  /** Balance still owed on those shows, one entry per currency (never summed across). */
  owed: { currency: Currency; amount: number }[]
}

/** Figures for one manager's card. Rows are attributed by owner_id, the same rule the needs list uses. */
export function summarise(
  managerId: string,
  inquiries: Inquiry[],
  flagged: { inquiry: Inquiry; reasons: Reason[] }[],
  today: string,
): Summary {
  const mine = flagged.filter((f) => f.inquiry.owner_id === managerId)
  const top = mine.reduce<Reason | null>((best, f) => (best === null || REASON_RANK[f.reasons[0]] < REASON_RANK[best] ? f.reasons[0] : best), null)

  const ahead = inquiries.filter(
    (i) => i.owner_id === managerId && (i.status === 'booking_confirmed' || i.status === 'deposit_paid') && i.event_date && i.event_date >= today,
  )
  const totals = new Map<Currency, number>()
  for (const i of ahead) {
    const b = i.money?.balance ?? 0
    if (b > 0 && i.money) totals.set(i.money.currency, (totals.get(i.money.currency) ?? 0) + b)
  }
  const owed = (['LKR', 'USD'] as Currency[]).flatMap((currency) => (totals.has(currency) ? [{ currency, amount: totals.get(currency)! }] : []))

  return { need: mine.length, top, booked: ahead.length, owed }
}
