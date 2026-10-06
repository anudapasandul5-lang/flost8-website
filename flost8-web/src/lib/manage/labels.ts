import type { Artist, Inquiry } from './types'

export function artistNames(slugs: string[], artists: Artist[]): string {
  return slugs.map((s) => artists.find((a) => a.slug === s)?.name ?? s).join(' + ')
}

/** The best human name we have for an inquiry. */
export function inquiryTitle(i: Pick<Inquiry, 'event_name' | 'venue' | 'organizer_name'>): string {
  return i.event_name?.trim() || i.venue?.trim() || i.organizer_name?.trim() || 'Untitled inquiry'
}
