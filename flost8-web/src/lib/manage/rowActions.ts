import { NotAllowedError } from './api'
import { canEditInquiry } from './access'
import { toEditInput, type NewEventInput, type NewStatus } from './newEvent'
import type { Inquiry, Manager } from './types'

/**
 * Status can be changed from the list on website and app-added rows only. Sheet rows are rewritten by the importer every
 * 15 minutes, so a status edit there would silently vanish (canEditInquiry already says no to them).
 */
export function canSetStatus(i: Inquiry, me: Manager): boolean {
  return i.source !== 'sheet_import' && canEditInquiry(i, me)
}

const STARTING: readonly string[] = ['new', 'quoted', 'tentative', 'deposit_paid', 'booking_confirmed']

/** Add-event starting values for "Duplicate": everything copied except the date and the (date-specific) ticket link. */
export function duplicateInput(i: Inquiry, allowed: ReadonlySet<string> | null): NewEventInput {
  const base = toEditInput(i)
  return {
    ...base,
    date: '',
    ticketLink: '',
    artists: allowed ? base.artists.filter((s) => allowed.has(s)) : base.artists,
    // No deposit is copied, so a copy of a "Deposit paid" show starts as Booked: nobody has paid anything for the new date.
    status: (i.status === 'deposit_paid' ? 'booking_confirmed' : STARTING.includes(i.status) ? i.status : i.status === 'reached_out' ? 'new' : 'tentative') as NewStatus,
  }
}

export interface BulkResult {
  total: number
  done: string[]
  notAllowed: string[]
  failed: string[]
}

/** Runs `fn` for each id in turn. A refusal or error on one row never stops the rest. */
export async function runBulk(ids: string[], fn: (id: string) => Promise<void>): Promise<BulkResult> {
  const r: BulkResult = { total: ids.length, done: [], notAllowed: [], failed: [] }
  for (const id of ids) {
    try {
      await fn(id)
      r.done.push(id)
    } catch (err) {
      if (err instanceof NotAllowedError) r.notAllowed.push(id)
      else r.failed.push(id)
    }
  }
  return r
}

/** "7 of 8 updated, 1 not allowed" */
export function bulkSummary(r: BulkResult, verb: string): string {
  if (r.done.length === r.total) return `${r.total} ${verb}`
  const parts = [`${r.done.length} of ${r.total} ${verb}`]
  if (r.notAllowed.length) parts.push(`${r.notAllowed.length} not allowed`)
  if (r.failed.length) parts.push(`${r.failed.length} failed`)
  return parts.join(', ')
}

/** Snoozing is a note to self, so a sheet row can be snoozed (the database allows that one column); the person must still be able to edit the row's owner's inquiries. */
export function canSnooze(i: Inquiry, me: Manager): boolean {
  return me.role === 'owner' || i.owner_id === null || i.owner_id === me.id
}
