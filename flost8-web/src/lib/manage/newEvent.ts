import { parseAmountInput } from './money'
import { isHttpUrl } from './access'
import type { Artist, Currency, Inquiry, Manager, Money } from './types'

export type NewStatus = 'new' | 'quoted' | 'tentative' | 'deposit_paid' | 'booking_confirmed'

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
  ticketLink: string
  /** Set when the organiser was picked from Contacts; the name, phone and email are then copied from that contact. */
  contactId: string | null
  email: string
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
  ticketLink: '',
  contactId: null,
  email: '',
}

/** The first problem in plain English, or null when the entry can be saved. */
export function validateNewEvent(i: NewEventInput): string | null {
  const ticket = i.ticketLink.trim()
  if (ticket && (ticket.length > 2000 || !isHttpUrl(ticket))) return 'The ticket link must be an http(s) address, at most 2000 characters.'
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
    organizer_email: nul(i.email),
    contact_id: i.contactId,
    ticket_link: nul(i.ticketLink),
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

/** The form's starting values when editing a saved event. Status is not part of the edit (the drawer owns it). */
export function toEditInput(i: Inquiry): NewEventInput {
  return {
    artists: [...i.artists],
    date: i.event_date ?? '',
    name: i.event_name ?? '',
    venue: i.venue ?? '',
    city: i.city ?? '',
    setTime: i.set_time ?? '',
    status: i.status as NewStatus,
    fee: i.money?.fee != null ? String(i.money.fee) : '',
    currency: i.money?.currency ?? 'LKR',
    organizer: i.organizer_name ?? '',
    phone: i.organizer_phone ?? '',
    ticketLink: i.ticket_link ?? '',
    contactId: i.contact_id,
    email: i.organizer_email ?? '',
  }
}

/** Columns an edit may change. Never source, status or owner. */
export function toEditPatch(i: NewEventInput) {
  const row = toInquiryRow(i, null)
  return {
    event_name: row.event_name,
    event_date: row.event_date,
    venue: row.venue,
    city: row.city,
    set_time: row.set_time,
    organizer_name: row.organizer_name,
    organizer_phone: row.organizer_phone,
    organizer_email: row.organizer_email,
    contact_id: row.contact_id,
    ticket_link: row.ticket_link,
  }
}

/**
 * The money row after an edit, or null to leave it alone (no fee typed). What was already paid stays paid:
 * the balance is the new fee minus the advance, never below zero.
 */
export function moneyForEdit(i: NewEventInput, existing: Money | null): Money | null {
  const fee = parseAmountInput(i.fee)
  if (fee === null || fee === undefined) return null
  if (!existing) return toMoneyRow(i)
  return { ...existing, currency: i.currency, fee, balance: Math.max(fee - (existing.advance ?? 0), 0) }
}
