import { inquiryTitle } from './labels'
import { nextStep, type NeedsActionContext, type Reason } from './needsAction'
import type { Inquiry } from './types'

/** Items spelled out in a nudge; the rest collapse into "and N more". */
export const NUDGE_MAX_ITEMS = 5

/** One line of plain text with no email addresses or phone numbers in it (money is formatted with commas, so it survives). */
function plain(line: string): string {
  return line
    .replace(/[^\s@]+@[^\s@]+/g, '')
    .replace(/\+?\d(?:[\s().-]?\d){6,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The WhatsApp message to send a manager, or null when they have nothing open. `lines` are next-step lines. */
export function buildNudgeMessage(managerName: string, lines: string[]): string | null {
  const all = lines.map(plain).filter(Boolean)
  if (all.length === 0) return null
  const shown = all.slice(0, NUDGE_MAX_ITEMS)
  if (all.length > shown.length) shown.push(`and ${all.length - shown.length} more`)
  const one = all.length === 1
  const first = managerName.trim().split(/\s+/)[0] || 'there'
  return `Hi ${first}, ${all.length} ${one ? 'thing needs' : 'things need'} you: ${shown.join('; ')}. Can you pick ${one ? 'this' : 'these'} up today?`
}

/** Tidy a typed number (strips spaces, dashes, dots and brackets) and check it: digits with an optional leading +, 7 to 15 of them. */
export function normaliseWhatsapp(input: string): string | null {
  const s = input.replace(/[\s\-().]/g, '')
  return /^\+?\d{7,15}$/.test(s) ? s : null
}

/**
 * Same rules as waLink: + or 00 means international (00 is dropped), any other leading 0 is a Sri Lankan local number
 * and wa.me needs 94 in its place.
 */
export function nudgeUrl(whatsapp: string, message: string): string {
  const digits = whatsapp.replace(/\D/g, '')
  const intl = whatsapp.trim().startsWith('+') ? digits : digits.startsWith('00') ? digits.slice(2) : digits.startsWith('0') ? `94${digits.slice(1)}` : digits
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`
}

/** Next-step lines for one manager's open items (rows are attributed by owner_id, like the needs list and summaries). */
export function nudgeLines(
  managerId: string,
  rows: { inquiry: Inquiry; reasons: Reason[] }[],
  all: Inquiry[],
  ctx: NeedsActionContext,
): string[] {
  return rows
    .filter((r) => r.inquiry.owner_id === managerId)
    .map(({ inquiry: i, reasons }) => {
      const line = nextStep(reasons[0], i, ctx, all)
      // These two lines do not name the show, which a manager with several open needs it to tell them apart.
      return reasons[0] === 'unpaid_soon' || reasons[0] === 'quote_quiet' ? `${line} for ${inquiryTitle(i)}` : line
    })
}
