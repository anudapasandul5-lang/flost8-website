import { describe, it, expect } from 'vitest'
import { canCommentOn, canDeleteInquiry, canEditInquiry, parseAuthError, isHttpUrl, isPlainEmail } from './access'
import { KASUNI, makeInquiry, OWNER } from './testFixtures'

describe('parseAuthError', () => {
  it('reads the PKCE query form', () => {
    expect(
      parseAuthError('?error=server_error&error_description=Database+error+saving+new+user', ''),
    ).toBe('Database error saving new user')
  })
  it('reads the implicit hash form', () => {
    expect(parseAuthError('', '#error=access_denied&error_description=This+email+is+not+allowed+to+sign+in')).toBe(
      'This email is not allowed to sign in',
    )
  })
  it('falls back to the error code and returns null for a clean URL', () => {
    expect(parseAuthError('?error=access_denied', '')).toBe('access_denied')
    expect(parseAuthError('', '')).toBeNull()
    expect(parseAuthError('?code=abc', '')).toBeNull()
  })
})

describe('canEditInquiry', () => {
  it('never allows editing sheet-imported rows, even for the owner', () => {
    expect(canEditInquiry(makeInquiry({ source: 'sheet_import', owner_id: KASUNI.id }), KASUNI)).toBe(false)
    expect(canEditInquiry(makeInquiry({ source: 'sheet_import' }), OWNER)).toBe(false)
  })
  it('allows the owner role, the inquiry owner, and anyone when nobody owns it', () => {
    expect(canEditInquiry(makeInquiry({ owner_id: 'someone-else' }), OWNER)).toBe(true)
    expect(canEditInquiry(makeInquiry({ owner_id: KASUNI.id }), KASUNI)).toBe(true)
    expect(canEditInquiry(makeInquiry({ owner_id: null }), KASUNI)).toBe(true)
  })
  it("refuses another manager's inquiry", () => {
    expect(canEditInquiry(makeInquiry({ owner_id: 'someone-else' }), KASUNI)).toBe(false)
  })
})

describe('link safety', () => {
  it('accepts only http(s) addresses', () => {
    expect(isHttpUrl('https://drive.google.com/x')).toBe(true)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('data:text/html,x')).toBe(false)
    expect(isHttpUrl('not a url')).toBe(false)
    expect(isHttpUrl(null)).toBe(false)
  })
  it('accepts only a plain email', () => {
    expect(isPlainEmail('a@b.co')).toBe(true)
    expect(isPlainEmail('sales@studio.lk')).toBe(true)
    expect(isPlainEmail('a b@c.co')).toBe(false)
    expect(isPlainEmail('a@bco')).toBe(false)
    expect(isPlainEmail('a@b.co?bcc=x@y.co')).toBe(false)
    expect(isPlainEmail('a@b.co,c@d.co')).toBe(false)
  })
})

describe('canCommentOn', () => {
  const mySlugs = new Set(['sonal'])
  it('allows anyone who can see the row, including read-only sheet rows', () => {
    expect(canCommentOn(makeInquiry({ source: 'sheet_import', owner_id: 'other', artists: ['sonal'] }), KASUNI, mySlugs)).toBe(true)
    expect(canCommentOn(makeInquiry({ owner_id: KASUNI.id, artists: ['anush'] }), KASUNI, mySlugs)).toBe(true)
    expect(canCommentOn(makeInquiry({ owner_id: 'other', artists: ['anush'] }), OWNER, new Set())).toBe(true)
  })
  it('refuses a row the manager neither owns nor has an artist on', () => {
    expect(canCommentOn(makeInquiry({ owner_id: 'other', artists: ['anush'] }), KASUNI, mySlugs)).toBe(false)
  })
})

describe('canDeleteInquiry', () => {
  it('lets the owner delete any event, whatever its source', () => {
    for (const source of ['manual', 'website', 'sheet_import'] as const) {
      expect(canDeleteInquiry(makeInquiry({ source, owner_id: 'someone-else' }), OWNER)).toBe(true)
      expect(canDeleteInquiry(makeInquiry({ source, owner_id: null }), OWNER)).toBe(true)
    }
  })
  it('lets a manager delete their own events of any source', () => {
    for (const source of ['manual', 'website', 'sheet_import'] as const) {
      expect(canDeleteInquiry(makeInquiry({ source, owner_id: KASUNI.id }), KASUNI)).toBe(true)
    }
  })
  it("never offers a manager another manager's or an ownerless event", () => {
    for (const source of ['manual', 'website', 'sheet_import'] as const) {
      expect(canDeleteInquiry(makeInquiry({ source, owner_id: 'someone-else' }), KASUNI)).toBe(false)
      expect(canDeleteInquiry(makeInquiry({ source, owner_id: null }), KASUNI)).toBe(false)
    }
  })
})
