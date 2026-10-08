import { inquiryTitle } from './labels'
import type { Currency, Inquiry } from './types'

const MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** One show on one day. Several inquiries here means a joint show: one line per artist. */
export interface ShowGroup {
  key: string
  items: Inquiry[]
}

export interface MonthGroup {
  key: string
  side: 'upcoming' | 'past' | 'undated'
  label: string
  shows: ShowGroup[]
  showCount: number
  /** Sum of the visible fees; null when no fee is visible or the currencies differ. */
  fee: { currency: Currency; total: number } | null
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

/** Month sections of show cards, in the order the list already has (first seen wins). */
export function groupInquiries(items: Inquiry[], today: string): MonthGroup[] {
  const months = new Map<string, MonthGroup>()
  const shows = new Map<string, ShowGroup>()
  for (const i of items) {
    const side = !i.event_date ? 'undated' : i.event_date < today ? 'past' : 'upcoming'
    const month = i.event_date?.slice(0, 7)
    const mKey = `${side}-${month ?? 'none'}`
    let m = months.get(mKey)
    if (!m) {
      const label = month ? `${MON3[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}` : 'NO DATE'
      m = { key: mKey, side, label, shows: [], showCount: 0, fee: null }
      months.set(mKey, m)
    }
    // Undated rows never merge: nothing says they are the same show.
    const sKey = i.event_date ? `${mKey}|${i.event_date}|${norm(inquiryTitle(i))}|${norm(i.venue)}|${norm(i.city)}` : `${mKey}|${i.id}`
    let s = shows.get(sKey)
    if (!s) {
      s = { key: sKey, items: [] }
      shows.set(sKey, s)
      m.shows.push(s)
    }
    s.items.push(i)
  }
  return [...months.values()].map((m) => {
    const fees = m.shows.flatMap((s) => s.items).flatMap((i) => (i.money && i.money.fee != null ? [{ c: i.money.currency, f: i.money.fee }] : []))
    const single = fees.length > 0 && fees.every((x) => x.c === fees[0].c)
    return { ...m, showCount: m.shows.length, fee: single ? { currency: fees[0].c, total: fees.reduce((a, x) => a + x.f, 0) } : null }
  })
}
