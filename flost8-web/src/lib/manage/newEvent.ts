import { parseAmountInput } from './money'
import type { Artist, Currency, Manager, Money } from './types'

export type NewStatus = 'new' | 'quoted' | 'deposit_paid' | 'booking_confirmed'

/** The quick "add event" form. Everything is a string because that is what the inputs hold. */
export interface NewEventInput {
  artists: string[]
  date: string // YYYY-MM-DD
  name: string
  venue: string
  city: string
  setTime: string
  status: NewStatus
  fee: string
  currency: Currency
  organizer: string
  phone: string
}

export const EMPTY_EVENT: NewEventInput = {
  artists: [],
  date: '',
  name: '',
  venue: '',
  city: '',
  setTime: '',
  status: 'booking_confirmed',
  fee: '',
  currency: 'LKR',
  organizer: '',
  phone: '',
}

/** The first problem in plain English, or null when the entry can be saved. */
export function validateNewEvent(i: NewEventInput): string | null {
  if (i.artists.length === 0) return 'Pick at least one artist.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.date)) return 'Pick the event date.'
  if (!i.name.trim() && !i.venue.trim()) return 'Add an event name or a venue.'
  const fee = parseAmountInput(i.fee)
  if (fee === undefined) return 'The fee must be a number, like 120000.'
  if (fee !== null && fee < 0) return 'The fee cannot be negative.'
  return null
}

const nul = (s: string) => s.trim() || null

/** Columns for the inquiries table. source 'manual' is what the "Added in app" tag keys on. */
export function toInquiryRow(i: NewEventInput, ownerId: string | null) {
  return {
    source: 'manual',
    status: i.status,
    owner_id: ownerId,
    event_name: nul(i.name),
    event_date: i.date,
    venue: nul(i.venue),
    city: nul(i.city),
    set_time: nul(i.setTime),
    organizer_name: nul(i.organizer),
    organizer_phone: nul(i.phone),
  }
}

/** Nothing has been paid on a brand-new entry, so the whole fee is the balance owed. Null when no fee was typed. */
export function toMoneyRow(i: NewEventInput): Money | null {
  const fee = parseAmountInput(i.fee)
  if (fee === null || fee === undefined) return null
  return { currency: i.currency, fee, advance: null, balance: fee, balance_note: null, total: null, booking_fee: null }
}

/** A manager owns what they add. The owner role hands it to the first artist's manager (the database would do the same). */
export function ownerFor(slugs: string[], me: Manager, artists: Artist[]): string | null {
  if (me.role !== 'owner') return me.id
  return artists.find((a) => a.slug === slugs[0])?.manager_id ?? null
}
