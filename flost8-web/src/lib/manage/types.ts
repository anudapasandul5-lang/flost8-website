export type Status =
  | 'new'
  | 'reached_out'
  | 'quoted'
  | 'tentative'
  | 'deposit_paid'
  | 'booking_confirmed'
  | 'lost'
  | 'spam'

export type Currency = 'LKR' | 'USD'

export interface Manager {
  id: string
  name: string
  email: string | null
  role: 'owner' | 'manager'
  user_id: string | null
}

export interface Artist {
  slug: string
  name: string
  manager_id: string | null
}

export interface Money {
  currency: Currency
  fee: number | null
  advance: number | null
  balance: number | null
  balance_note: string | null
  total: number | null
  booking_fee: number | null
}

export interface Inquiry {
  id: string
  created_at: string
  updated_at: string
  status: Status
  source: string
  owner_id: string | null
  sheet_updated_at: string | null
  set_type: string | null
  event_name: string | null
  event_date: string | null // YYYY-MM-DD
  venue: string | null
  city: string | null
  event_type: string | null
  set_duration_h: number | null
  set_time: string | null
  deal_type: string | null
  lead_source: string | null
  platform: string | null
  brand: string | null
  collab_type: string | null
  invoice_no: string | null
  organizer_name: string | null
  organizer_phone: string | null
  organizer_email: string | null
  other_artists: string | null
  notes: string | null
  contract_signed: boolean
  contract_url: string | null
  travel_notes: string | null
  lost_reason: string | null
  /** Artist slugs in lineup order. */
  artists: string[]
  /** Present only when the database let this manager see the money. */
  money: Money | null
}

export interface ActivityRow {
  id: number
  actor_id: string | null
  kind: string
  data: Record<string, unknown>
  created_at: string
}
