import type { Inquiry } from './types'

export interface DayCell {
  iso: string
  day: number
  inMonth: boolean
}

function iso(y: number, m0: number, d: number): string {
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Weeks (Monday first) covering the month; leading/trailing days come from the neighbours. */
export function monthGrid(year: number, month0: number): DayCell[][] {
  const first = new Date(Date.UTC(year, month0, 1))
  const lead = (first.getUTCDay() + 6) % 7 // Monday = 0
  const start = new Date(Date.UTC(year, month0, 1 - lead))
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
  const weeks = Math.ceil((lead + daysInMonth) / 7)
  const out: DayCell[][] = []
  for (let w = 0; w < weeks; w++) {
    const row: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const c = new Date(start.getTime() + (w * 7 + d) * 86_400_000)
      row.push({
        iso: iso(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate()),
        day: c.getUTCDate(),
        inMonth: c.getUTCMonth() === month0,
      })
    }
    out.push(row)
  }
  return out
}

export function shiftMonth(year: number, month0: number, delta: number): { year: number; month0: number } {
  const t = year * 12 + month0 + delta
  return { year: Math.floor(t / 12), month0: ((t % 12) + 12) % 12 }
}

export function groupByDate(list: Inquiry[]): Map<string, Inquiry[]> {
  const map = new Map<string, Inquiry[]>()
  for (const i of list) {
    if (!i.event_date) continue
    const arr = map.get(i.event_date)
    if (arr) arr.push(i)
    else map.set(i.event_date, [i])
  }
  return map
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const monthTitle = (year: number, month0: number) => `${MONTHS[month0]} ${year}`

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** '2026-10-12' -> 'Mon 12 Oct 2026' (no timezone maths, the date is a plain calendar date). */
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return 'No date yet'
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  const dow = DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${dow} ${d} ${MON3[m - 1]} ${y}`
}
