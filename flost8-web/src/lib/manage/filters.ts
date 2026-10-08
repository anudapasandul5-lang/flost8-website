import type { Inquiry, Status } from './types'

export type Scope = 'mine' | 'everyone'
export type Timeframe = 'all' | 'upcoming' | 'past'

export interface Filters {
  scope: Scope
  /** Empty = every status except spam. Pick 'spam' explicitly to see archived spam. */
  statuses: Status[]
  search: string
  timeframe: Timeframe
  /** Artist slug, '' = all artists. */
  artist: string
}

export const DEFAULT_FILTERS: Filters = {
  scope: 'mine',
  statuses: [],
  search: '',
  timeframe: 'all',
  artist: '',
}

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" is right in Colombo late at night). */
export function todayISO(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

export interface FilterContext {
  /** Slugs of the artists this manager looks after. */
  mySlugs: ReadonlySet<string>
  today: string
}

export function matchesFilters(
  i: Inquiry,
  f: Filters,
  ctx: FilterContext,
  opts: { ignoreTimeframe?: boolean } = {},
): boolean {
  if (f.scope === 'mine' && !i.artists.some((s) => ctx.mySlugs.has(s))) return false
  if (f.artist && !i.artists.includes(f.artist)) return false

  if (f.statuses.length === 0) {
    if (i.status === 'spam') return false
  } else if (!f.statuses.includes(i.status)) {
    return false
  }

  if (!opts.ignoreTimeframe && f.timeframe !== 'all') {
    if (!i.event_date) return false
    if (f.timeframe === 'upcoming' && i.event_date < ctx.today) return false
    if (f.timeframe === 'past' && i.event_date >= ctx.today) return false
  }

  const q = f.search.trim().toLowerCase()
  if (q) {
    const hay = [i.event_name, i.venue, i.organizer_name].filter(Boolean).join('\n').toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}

/**
 * Closest first: upcoming events soonest-first, then past events most-recent-first, then undated ones (newest-created first).
 * "Upcoming" includes today.
 */
export function sortByCloseness(list: Inquiry[], today: string): Inquiry[] {
  const band = (i: Inquiry) => (!i.event_date ? 2 : i.event_date >= today ? 0 : 1)
  return [...list].sort((a, b) => {
    const ba = band(a)
    const bb = band(b)
    if (ba !== bb) return ba - bb
    if (a.event_date && b.event_date && a.event_date !== b.event_date) {
      const earlier = a.event_date < b.event_date ? -1 : 1
      return ba === 0 ? earlier : -earlier
    }
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
  })
}

export function applyFilters(
  all: Inquiry[],
  f: Filters,
  ctx: FilterContext,
  opts: { ignoreTimeframe?: boolean } = {},
): Inquiry[] {
  return sortByCloseness(all.filter((i) => matchesFilters(i, f, ctx, opts)), ctx.today)
}
