import type { Inquiry, Manager } from './types'

/**
 * Supabase sends the user back to /manage?error=...&error_description=... (query for the
 * PKCE flow, hash for the implicit flow) when sign-in fails, e.g. the allow-list rejected
 * the email. Returns the description, or null when the URL carries no auth error.
 */
export function parseAuthError(search: string, hash: string): string | null {
  for (const raw of [search, hash.startsWith('#') ? hash.slice(1) : hash]) {
    const p = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw)
    if (p.has('error_description') || p.has('error')) {
      return p.get('error_description') || p.get('error') || 'error'
    }
  }
  return null
}

/** Mirrors the database's can_edit() plus the rule that sheet-imported rows are read-only for now. */
export function canEditInquiry(i: Inquiry, me: Manager): boolean {
  if (i.source === 'sheet_import') return false
  return me.role === 'owner' || i.owner_id === null || i.owner_id === me.id
}
