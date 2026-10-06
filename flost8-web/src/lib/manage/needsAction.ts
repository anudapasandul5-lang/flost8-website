import { inquiryTitle } from './labels'
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

function hoursQuiet(i: Inquiry, c: NeedsActionContext): number {
  return (c.now.getTime() - new Date(c.lastTouch.get(i.id) ?? i.updated_at).getTime()) / 3_600_000
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
  // A tentative date is only being held: nothing is owed and nobody is waiting, so it never nags.
  if (i.status === 'lost' || i.status === 'spam' || i.status === 'tentative') return []
  if (i.event_date && i.event_date < c.today) return []

  const out: Reason[] = []
  const booked = i.status === 'booking_confirmed' || i.status === 'deposit_paid'

  if (c.conflicts.has(i.id)) out.push('double_booked')

  if (booked && i.event_date && i.event_date <= addDays(c.today, UNPAID_WITHIN_DAYS) && (i.money?.balance ?? 0) > 0) {
    out.push('unpaid_soon')
  }

  const quietHours = hoursQuiet(i, c)
  if (i.status === 'new' && quietHours > NO_REPLY_HOURS) out.push('no_reply')
  if (i.status === 'quoted' && quietHours > QUOTE_QUIET_DAYS * 24) out.push('quote_quiet')

  return out
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortDate = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MON[m - 1]}` }
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

/** The other confirmed booking sharing an artist and a date with `i`, if any. */
export function clashPartner(i: Inquiry, all: Inquiry[]): Inquiry | undefined {
  return all.find(
    (o) => o.id !== i.id && o.status === 'booking_confirmed' && o.event_date === i.event_date && o.artists.some((s) => i.artists.includes(s)),
  )
}

/** The one line a manager reads on the card: a verb and what to do. */
export function nextStep(reason: Reason, i: Inquiry, c: NeedsActionContext, all: Inquiry[]): string {
  switch (reason) {
    case 'double_booked': {
      const other = clashPartner(i, all)
      return other ? `Fix clash with ${inquiryTitle(other)}` : 'Fix double booking'
    }
    case 'unpaid_soon': {
      const m = i.money
      return `Chase ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(m?.balance ?? 0)} ${m?.currency ?? 'LKR'} before ${shortDate(i.event_date ?? '')}`
    }
    case 'no_reply':
      return `Reply to ${i.organizer_name?.trim() || inquiryTitle(i)} (${plural(Math.max(1, Math.floor(hoursQuiet(i, c) / 24)), 'day')})`
    case 'quote_quiet':
      return `Follow up on quote (${plural(Math.floor(hoursQuiet(i, c) / 24), 'day')})`
  }
}

/**
 * wa.me link for a phone number, or null when it is not a usable number (the button is then hidden).
 * Sri Lankan local numbers (0771234567) get 94; anything with a + or 00 prefix is taken as international.
 */
export function waLink(phone: string | null | undefined): string | null {
  if (!phone) return null
  const raw = phone.trim()
  let d = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) d = d.replace(/^0+/, '')
  else if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0')) d = '94' + d.slice(1)
  return d.length >= 9 && d.length <= 15 ? `https://wa.me/${d}` : null
}

/** Upcoming booked or deposit-paid shows, soonest first (callers pass only what the viewer may see). */
export function upcomingBooked(list: Inquiry[], today: string): Inquiry[] {
  return list
    .filter((i) => (i.status === 'booking_confirmed' || i.status === 'deposit_paid') && i.event_date && i.event_date >= today)
    .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1))
}

/** Soonest upcoming booked show in the list. */
export function nextBookedShow(list: Inquiry[], today: string): Inquiry | undefined {
  return upcomingBooked(list, today)[0]
}
