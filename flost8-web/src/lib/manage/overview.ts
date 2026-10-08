import { totalsByCurrency } from './money'
import { nextBookedShow, REASON_RANK, type Reason } from './needsAction'
import { STATUS_ORDER } from './status'
import type { Currency, Inquiry, Status } from './types'

// Numbers behind the Overview tiles and charts. Callers pass only the inquiries the viewer may see
// (the database already hides other managers' money), and a manager filter is applied before calling.

const REASONS = Object.keys(REASON_RANK) as Reason[]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const live = (i: Inquiry) => i.status !== 'lost' && i.status !== 'spam'
const booked = (i: Inquiry) => i.status === 'booking_confirmed' || i.status === 'deposit_paid'
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null)

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export interface NeedTile {
  count: number
  /** Most urgent reason among the waiting rows; colours the tile. */
  top: Reason | null
  /** Rows counted by their most urgent reason, so the parts add up to `count`. */
  byReason: Record<Reason, number>
}

export interface OwedTile {
  currency: Currency
  amount: number
  /** Part of `amount` on shows within the next 7 days. */
  dueSoon: number
}

export interface DepositTile {
  currency: Currency
  quoted: number
  collected: number
  /** null when nothing is quoted. */
  pct: number | null
}

export interface Tiles {
  need: NeedTile
  /** Upcoming booked or deposit-paid shows, and the soonest one. */
  booked: { count: number; next: Inquiry | undefined }
  /** Balance still owed on those shows, one entry per currency (never summed across). */
  owed: OwedTile[]
  /** Deposits against fees on upcoming live inquiries, one entry per currency. */
  deposits: DepositTile[]
}

export function tiles(inquiries: Inquiry[], waiting: { inquiry: Inquiry; reasons: Reason[] }[], today: string): Tiles {
  const byReason = Object.fromEntries(REASONS.map((r) => [r, 0])) as Record<Reason, number>
  let top: Reason | null = null
  for (const w of waiting) {
    const r = w.reasons[0]
    byReason[r] += 1
    if (top === null || REASON_RANK[r] < REASON_RANK[top]) top = r
  }

  const ahead = inquiries.filter((i) => booked(i) && i.event_date && i.event_date >= today)
  const soon = addDays(today, 7)
  const dueSoon = totalsByCurrency(ahead.filter((i) => i.event_date! <= soon))
  const owed = totalsByCurrency(ahead)
    .filter((t) => t.balance > 0)
    .map((t) => ({ currency: t.currency, amount: t.balance, dueSoon: dueSoon.find((d) => d.currency === t.currency)?.balance ?? 0 }))

  const upcoming = inquiries.filter((i) => live(i) && i.event_date && i.event_date >= today)
  const deposits = totalsByCurrency(upcoming).map((t) => ({
    currency: t.currency,
    quoted: t.fee,
    collected: t.advance,
    pct: pct(t.advance, t.fee),
  }))

  return {
    need: { count: waiting.length, top, byReason },
    booked: { count: ahead.length, next: nextBookedShow(inquiries, today) },
    owed,
    deposits,
  }
}

export interface PipelineStage {
  status: Status
  count: number
}

/** Count per status in pipeline order. Spam is not a lead, so it is left out; lost stays in. */
export function pipeline(inquiries: Inquiry[]): { stages: PipelineStage[]; total: number; bookedPct: number | null } {
  const stages = STATUS_ORDER.filter((s) => s !== 'spam').map((status) => ({
    status,
    count: inquiries.filter((i) => i.status === status).length,
  }))
  const total = stages.reduce((n, s) => n + s.count, 0)
  return { stages, total, bookedPct: pct(stages.find((s) => s.status === 'booking_confirmed')?.count ?? 0, total) }
}

export interface MonthMoney {
  /** YYYY-MM */
  key: string
  label: string
  quoted: number
  deposits: number
}

export interface MoneyByMonth {
  months: MonthMoney[]
  /** Live rows in the window whose money the viewer cannot see. */
  skipped: number
  /** Live rows in the window priced in another currency (left off the LKR chart, never added in). */
  otherCurrency: number
}

const MONTH_COUNT = 6

/** Quoted fee and deposit per event month, LKR only: last month, this month, then the following ones. */
export function moneyByMonth(inquiries: Inquiry[], today: string): MoneyByMonth {
  const [y, m] = today.split('-').map(Number)
  const months: MonthMoney[] = Array.from({ length: MONTH_COUNT }, (_, k) => {
    const d = new Date(Date.UTC(y, m - 1 - 1 + k, 1))
    return { key: d.toISOString().slice(0, 7), label: MONTHS[d.getUTCMonth()], quoted: 0, deposits: 0 }
  })
  let skipped = 0
  let otherCurrency = 0
  for (const i of inquiries) {
    if (!live(i) || !i.event_date) continue
    const month = months.find((b) => b.key === i.event_date!.slice(0, 7))
    if (!month) continue
    if (!i.money) skipped += 1
    else if (i.money.currency !== 'LKR') otherCurrency += 1
    else {
      month.quoted += i.money.fee ?? 0
      month.deposits += i.money.advance ?? 0
    }
  }
  return { months, skipped, otherCurrency }
}
