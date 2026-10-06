import type { Inquiry } from './types'

export interface BookedRow {
  id: string
  event_name: string | null
  venue: string | null
  artists: string[]
}

/** Which of `artists` already have one of the `booked` rows on the same day. */
export function conflictsFor(
  artists: string[],
  booked: BookedRow[],
): { slug: string; row: BookedRow }[] {
  const out: { slug: string; row: BookedRow }[] = []
  for (const slug of artists) {
    const row = booked.find((b) => b.artists.includes(slug))
    if (row) out.push({ slug, row })
  }
  return out
}

/** Ids of confirmed inquiries that share an artist and a date with another confirmed one. */
export function conflictIds(list: Inquiry[]): Set<string> {
  const seen = new Map<string, string>() // "date|slug" -> first inquiry id
  const hit = new Set<string>()
  for (const i of list) {
    if (i.status !== 'booking_confirmed' || !i.event_date) continue
    for (const slug of i.artists) {
      const key = `${i.event_date}|${slug}`
      const first = seen.get(key)
      if (first && first !== i.id) {
        hit.add(first)
        hit.add(i.id)
      } else if (!first) {
        seen.set(key, i.id)
      }
    }
  }
  return hit
}

export function describeBooked(row: BookedRow): string {
  return row.event_name?.trim() || row.venue?.trim() || 'another booking'
}
