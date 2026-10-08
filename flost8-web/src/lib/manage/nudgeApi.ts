import { friendlyError } from './api'
import { normaliseWhatsapp } from './nudge'
import { getSupabase } from './supabase'

/**
 * Manager WhatsApp numbers are owner-only: they come from the manager_whatsapps() rpc, never from a managers column,
 * so a manager's own session cannot read anyone's number.
 */
type DbError = { code?: string; message?: string }
const isPermission = (e: DbError) => e.code === '42501' || /permission denied|not allowed|owner/i.test(e.message ?? '')
// The rpc does not exist until the owner applies migration 012; until then there are simply no numbers.
const isMissingFn = (e: DbError) => e.code === 'PGRST202' || e.code === '42883' || /could not find the function/i.test(e.message ?? '')

export class BadNumberError extends Error {
  constructor() {
    super('Enter the number with digits only and an optional + at the start (7 to 15 digits).')
  }
}

/** manager id -> WhatsApp number. Empty for anyone who is not the owner. */
export async function fetchManagerWhatsapps(): Promise<Map<string, string>> {
  const { data, error } = await getSupabase().rpc('manager_whatsapps')
  if (error) {
    if (isPermission(error) || isMissingFn(error)) return new Map()
    throw error
  }
  return new Map(((data ?? []) as { manager_id: string; whatsapp: string }[]).map((r) => [r.manager_id, r.whatsapp]))
}

/** Owner only. A number is tidied and checked first; null clears it. */
export async function setManagerWhatsapp(managerId: string, input: string | null): Promise<void> {
  const whatsapp = input === null ? null : normaliseWhatsapp(input)
  if (input !== null && whatsapp === null) throw new BadNumberError()
  const { error } = await getSupabase().rpc('set_manager_whatsapp', { p_manager: managerId, p_whatsapp: whatsapp })
  if (error) throw error
}

export function nudgeErrorText(err: unknown): string {
  if (err instanceof BadNumberError) return err.message
  const e = (typeof err === 'object' && err ? err : {}) as DbError
  if (isMissingFn(e)) return 'Saving numbers is not switched on yet.'
  if (isPermission(e)) return 'Only the owner can save a number.'
  return friendlyError(err)
}
