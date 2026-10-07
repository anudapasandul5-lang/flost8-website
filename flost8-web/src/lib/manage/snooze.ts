import { formatDate } from './calendar'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function utc(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (s: string, n: number) => iso(new Date(utc(s).getTime() + n * 86_400_000))

/** Snoozed means hidden until that calendar day: on the day itself (and after) the row is back. */
export function isSnoozed(i: { snoozed_until: string | null }, today: string): boolean {
  return !!i.snoozed_until && i.snoozed_until > today
}

/** Quick picks from the given day (todayISO): Tomorrow, and the coming Friday unless that is tomorrow. */
export function snoozeChoices(today: string): { label: string; date: string }[] {
  const tomorrow = addDays(today, 1)
  const toFriday = ((5 - utc(today).getUTCDay() + 7) % 7) || 7
  const friday = addDays(today, toFriday)
  return [{ label: 'Tomorrow', date: tomorrow }, ...(friday !== tomorrow ? [{ label: 'Friday', date: friday }] : [])]
}

/** "Snoozed till Fri" for a date within 7 days, otherwise "Snoozed till Thu 15 Oct 2026". */
export function snoozedLabel(until: string, today: string): string {
  const days = Math.round((utc(until).getTime() - utc(today).getTime()) / 86_400_000)
  return `Snoozed till ${days <= 7 ? DOW[utc(until).getUTCDay()] : formatDate(until)}`
}
