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

/** Mirrors can_view(): the owner role, the inquiry owner, or a manager with one of their artists on it. Read-only sheet rows are fine; commenting is not editing. */
export function canCommentOn(i: Inquiry, me: Manager, mySlugs: ReadonlySet<string>): boolean {
  return me.role === 'owner' || i.owner_id === me.id || i.artists.some((s) => mySlugs.has(s))
}

/** Only ever put an http(s) address in an href: a javascript: link would run when someone clicks it. */
export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** A plain address only (no ?bcc= or extra recipients), so a mailto: link cannot be abused. */
export function isPlainEmail(value: string | null | undefined): boolean {
  return !!value && /^[^\s@,;?&<>]+@[^\s@,;?&<>]+\.[^\s@,;?&<>]+$/.test(value)
}

/**
 * Delete is offered on any event, whatever its source: the owner role can delete any, a manager only their own.
 * Mirrors the database: inquiries_delete (owner) plus inquiries_delete_own (migration 015).
 * A deleted sheet row is remembered by the database so the importer does not bring it back.
 */
export function canDeleteInquiry(i: Inquiry, me: Manager): boolean {
  return me.role === 'owner' || i.owner_id === me.id
}
