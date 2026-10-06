import type { Inquiry } from './types'

export type Reason = 'double_booked' | 'unpaid_soon' | 'no_reply' | 'quote_quiet'

/** Lower = more urgent. The list sorts on this and the pills show reasons in this order. */
export const REASON_RANK: Record<Reason, number> = {
  double_booked: 0,
  unpaid_soon: 1,
  no_reply: 2,
  quote_quiet: 3,
}

export const NO_REPLY_HOURS = 24
export const QUOTE_QUIET_DAYS = 5
export const UNPAID_WITHIN_DAYS = 14

export interface NeedsActionContext {
  /** Local date, YYYY-MM-DD (see todayISO). */
  today: string
  /** Current moment, for the hour/day thresholds. */
  now: Date
  /** inquiry id -> last_touch timestamp from the inquiry_last_touch view. */
  lastTouch: ReadonlyMap<string, string>
  /** Ids from conflictIds(). */
  conflicts: ReadonlySet<string>
  meId: string
  isOwner: boolean
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/**
 * Why this inquiry needs action, most urgent first. Empty = nothing to do.
 * A manager only gets flags on rows they own (so a B2B show lands in one list); the owner sees all.
 * Flags clear only by acting: a comment or status change moves last_touch.
 */
export function needsAction(i: Inquiry, c: NeedsActionContext): Reason[] {
  if (!c.isOwner && i.owner_id !== c.meId) return []
  if (i.status === 'lost' || i.status === 'spam') return []
  if (i.event_date && i.event_date < c.today) return []

  const out: Reason[] = []
  const booked = i.status === 'booking_confirmed' || i.status === 'deposit_paid'

  if (c.conflicts.has(i.id)) out.push('double_booked')

  if (booked && i.event_date && i.event_date <= addDays(c.today, UNPAID_WITHIN_DAYS) && (i.money?.balance ?? 0) > 0) {
    out.push('unpaid_soon')
  }

  const touchedMs = new Date(c.lastTouch.get(i.id) ?? i.updated_at).getTime()
  const quietHours = (c.now.getTime() - touchedMs) / 3_600_000
  if (i.status === 'new' && quietHours > NO_REPLY_HOURS) out.push('no_reply')
  if (i.status === 'quoted' && quietHours > QUOTE_QUIET_DAYS * 24) out.push('quote_quiet')

  return out
}
