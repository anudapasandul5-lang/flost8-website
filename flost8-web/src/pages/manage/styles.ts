import type { Reason } from '../../lib/manage/needsAction'

// Shared class strings for the /manage screens. Shape rule: pills for buttons and chips,
// 12px for inputs, 16px for panels. Every tap target is at least 44px tall.
const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)]'

export const INPUT = `w-full min-h-[48px] rounded-xl border border-[var(--bg-line)] bg-[var(--bg-raise)] px-4 py-3 font-grotesk text-[16px] text-ink placeholder:text-[var(--ink-32)] focus:border-[var(--accent-line)] focus:outline-none`

export const BTN_PRIMARY = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-accent px-6 font-grotesk text-[1rem] font-medium text-ink transition active:scale-[0.98] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`

export const BTN_GHOST = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[var(--bg-line)] px-5 font-grotesk text-sm text-[var(--ink-72)] transition active:scale-[0.98] hover:bg-[var(--bg-raise)] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`

export const LABEL = 'mb-1.5 block font-grotesk text-sm text-[var(--ink-72)]'

export const PANEL = 'rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)]'

export const CHIP_BASE = `inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 font-grotesk text-sm transition active:scale-[0.98] ${FOCUS}`
export const CHIP_ON = 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-ink'
export const CHIP_OFF = 'border-[var(--bg-line)] text-[var(--ink-72)] hover:bg-[var(--bg-raise)]'

export const FOCUS_RING = FOCUS

/** Colour is reserved for urgency: the card edge and the next-step line. */
export const REASON_COLOR: Record<Reason, string> = {
  double_booked: '#FF6B6B',
  unpaid_soon: '#FCD34D',
  no_reply: '#C88BFF',
  quote_quiet: '#7DD3FC',
}
