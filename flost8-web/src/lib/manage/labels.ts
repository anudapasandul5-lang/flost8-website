import type { Artist, Inquiry } from './types'

export function artistNames(slugs: string[], artists: Artist[]): string {
  return slugs.map((s) => artists.find((a) => a.slug === s)?.name ?? s).join(' + ')
}

/** The best human name we have for an inquiry. */
export function inquiryTitle(i: Pick<Inquiry, 'event_name' | 'venue' | 'organizer_name'>): string {
  return i.event_name?.trim() || i.venue?.trim() || i.organizer_name?.trim() || 'Untitled inquiry'
}

/** Each manager's own Google Sheet workbook (same files sync.gs and import.gs read), keyed by manager name. */
export const SHEET_URLS: Record<string, string> = {
  Kasuni: 'https://docs.google.com/spreadsheets/d/1qBBtNYlbg3z3og7wb_RdeHlZkbGU_ihVxfHJdl1__do/edit',
  Nirbheeth: 'https://docs.google.com/spreadsheets/d/1f9_KX_W0hAZmf4A-_iXeVoTdgkv1vB1-xWon-bSIauo/edit',
}
