import type { AdminShow } from '../showsAdmin'
import { isHttpUrl } from './access'
import type { Artist, Inquiry } from './types'

export type PublicInquiry = Pick<Inquiry, 'source' | 'status' | 'event_date' | 'event_name' | 'venue' | 'city' | 'set_time' | 'artists'> & { ticket_link?: string | null }

/** Only these seven values ever cross into the public Shows sheet. */
export function toShow(i: PublicInquiry, artists: Artist[]): AdminShow | null {
  if (i.source !== 'manual' || !['booking_confirmed', 'deposit_paid'].includes(i.status)) return null
  const date = i.event_date ?? ''
  const parsed = new Date(`${date}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null
  const lineup = i.artists.map(slug => artists.find(a => a.slug === slug))
  if (!lineup.length || lineup.some(a => !a)) return null
  const venue = (i.event_name || i.venue || '').trim()
  const city = (i.city || '').trim()
  if (!venue || !city) return null
  const link = (i.ticket_link ?? '').trim()
  return { date, time: (i.set_time ?? '').trim(), venue, city, artist: i.artists[0], artist_display: lineup.map(a => a!.name).join(' B2B '), ticket_link: link.length <= 2000 && isHttpUrl(link) ? link : '' }
}

/** Sheet sync owns these rows; matching any member of a B2B lineup avoids duplicate cards. */
export function alreadySynced(show: AdminShow, existing: AdminShow[]): boolean {
  const names = show.artist_display.split(' B2B ')
  return existing.some(s => s.id?.startsWith('sync:') && s.date === show.date &&
    (s.artist === show.artist || s.artist_display.split(' B2B ').some(name => names.includes(name))))
}
