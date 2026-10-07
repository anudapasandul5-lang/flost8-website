import type { Inquiry, Manager } from './types'

export function makeInquiry(over: Partial<Inquiry> = {}): Inquiry {
  return {
    id: 'i1',
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    status: 'new',
    source: 'website',
    owner_id: null,
    sheet_updated_at: null,
    set_type: null,
    event_name: 'Test Night',
    event_date: '2026-11-14',
    venue: 'The Factory',
    city: 'Colombo',
    event_type: null,
    set_duration_h: null,
    set_time: null,
    ticket_link: null,
    website_show_id: null,
    contact_id: null,
    no_auto_publish: false,
    deal_type: null,
    lead_source: null,
    platform: null,
    brand: null,
    collab_type: null,
    invoice_no: null,
    organizer_name: 'Ishara',
    organizer_phone: null,
    organizer_email: null,
    other_artists: null,
    notes: null,
    contract_signed: false,
    contract_url: null,
    travel_notes: null,
    lost_reason: null,
    artists: ['dr-green'],
    money: null,
    ...over,
  }
}

export const KASUNI: Manager = { id: 'm-kasuni', name: 'Kasuni', email: 'k@x.lk', role: 'manager', user_id: 'u1' }
export const OWNER: Manager = { id: 'm-owner', name: 'Anuda', email: 'a@x.lk', role: 'owner', user_id: 'u2' }
