import type { Status } from './types'

export const STATUS_ORDER: Status[] = [
  'new',
  'reached_out',
  'quoted',
  'deposit_paid',
  'booking_confirmed',
  'lost',
  'spam',
]

export const STATUS_LABEL: Record<Status, string> = {
  new: 'New',
  reached_out: 'Reached out',
  quoted: 'Quote sent',
  deposit_paid: 'Deposit paid',
  booking_confirmed: 'Booked',
  lost: 'Lost',
  spam: 'Spam',
}

/** Text + tint colours that stay readable on the dark FLOST8 surface. */
export const STATUS_COLOR: Record<Status, { fg: string; bg: string }> = {
  new: { fg: '#C88BFF', bg: 'rgba(157,20,255,0.18)' },
  reached_out: { fg: '#7DD3FC', bg: 'rgba(125,211,252,0.14)' },
  quoted: { fg: '#FCD34D', bg: 'rgba(252,211,77,0.14)' },
  deposit_paid: { fg: '#5EEAD4', bg: 'rgba(94,234,212,0.14)' },
  booking_confirmed: { fg: '#86EFAC', bg: 'rgba(134,239,172,0.16)' },
  lost: { fg: '#FCA5A5', bg: 'rgba(252,165,165,0.12)' },
  spam: { fg: '#A1A1AA', bg: 'rgba(161,161,170,0.14)' },
}

export function statusLabel(s: string): string {
  return STATUS_LABEL[s as Status] ?? s
}
