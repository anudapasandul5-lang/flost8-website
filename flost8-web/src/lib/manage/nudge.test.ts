import { describe, expect, it } from 'vitest'
import { buildNudgeMessage, nudgeLines, nudgeUrl, normaliseWhatsapp } from './nudge'
import type { NeedsActionContext } from './needsAction'
import { KASUNI, makeInquiry } from './testFixtures'

describe('buildNudgeMessage', () => {
  it('is null when there is nothing to nudge', () => {
    expect(buildNudgeMessage('Kasuni', [])).toBeNull()
  })
  it('lists the items in one plain line', () => {
    expect(buildNudgeMessage('Kasuni Perera', ['Reply to Hilton (2 days)', 'Chase 45,000 LKR before 3 Nov', 'Follow up on quote (6 days)'])).toBe(
      'Hi Kasuni, 3 things need you: Reply to Hilton (2 days); Chase 45,000 LKR before 3 Nov; Follow up on quote (6 days). Can you pick these up today?',
    )
  })
  it('uses singular wording for one item', () => {
    expect(buildNudgeMessage('Nirbheeth', ['Reply to Hilton (1 day)'])).toBe(
      'Hi Nirbheeth, 1 thing needs you: Reply to Hilton (1 day). Can you pick this up today?',
    )
  })
  it('caps at five items and says how many more', () => {
    const lines = Array.from({ length: 8 }, (_, i) => `Item ${i + 1}`)
    expect(buildNudgeMessage('Kasuni', lines)).toBe(
      'Hi Kasuni, 8 things need you: Item 1; Item 2; Item 3; Item 4; Item 5; and 3 more. Can you pick these up today?',
    )
  })
  it('exactly five has no "and N more"', () => {
    const m = buildNudgeMessage('Kasuni', ['a', 'b', 'c', 'd', 'e'])!
    expect(m).not.toMatch(/more/)
  })
  it('never leaks emails or phone numbers, and stays on one line', () => {
    const m = buildNudgeMessage('Kasuni', ['Reply to ishara@gmail.com (2 days)', 'Reply to Ruwan +94 77 123 4567\n(1 day)', 'Chase 45,000 LKR before 3 Nov'])!
    expect(m).not.toMatch(/@|\d{3}[\s-]?\d{3}|\n/)
    expect(m).toContain('45,000 LKR')
  })
})

describe('normaliseWhatsapp', () => {
  it('strips spaces, dashes and brackets', () => {
    expect(normaliseWhatsapp(' +94 (77) 123-4567 ')).toBe('+94771234567')
    expect(normaliseWhatsapp('0771234567')).toBe('0771234567')
  })
  it('accepts 7 to 15 digits only', () => {
    expect(normaliseWhatsapp('123456')).toBeNull()
    expect(normaliseWhatsapp('1234567')).toBe('1234567')
    expect(normaliseWhatsapp('+123456789012345')).toBe('+123456789012345')
    expect(normaliseWhatsapp('1234567890123456')).toBeNull()
  })
  it('rejects letters, a stray + and empty input', () => {
    expect(normaliseWhatsapp('')).toBeNull()
    expect(normaliseWhatsapp('077abc4567')).toBeNull()
    expect(normaliseWhatsapp('94+771234567')).toBeNull()
  })
})

describe('nudgeUrl', () => {
  it('uses digits only and encodes the message', () => {
    expect(nudgeUrl('+94 77 123 4567', 'Hi & bye?')).toBe('https://wa.me/94771234567?text=Hi%20%26%20bye%3F')
  })
})

describe('nudgeLines', () => {
  const NOW = new Date('2026-10-10T12:00:00Z')
  const ctx: NeedsActionContext = { today: '2026-10-10', now: NOW, lastTouch: new Map(), conflicts: new Set(), meId: 'm-owner', isOwner: true }
  const old = new Date(NOW.getTime() - 50 * 3_600_000).toISOString()
  const mk = (id: string, over = {}) => makeInquiry({ id, owner_id: KASUNI.id, updated_at: old, ...over })

  it('uses the next-step line of each flagged row the manager owns, nobody else', () => {
    const a = mk('a', { organizer_name: 'Hilton' })
    const b = mk('b', { status: 'quoted', event_name: 'Kaos Night' })
    const other = mk('c', { owner_id: 'someone-else' })
    const rows = [a, b, other].map((inquiry) => ({ inquiry, reasons: [inquiry.status === 'quoted' ? 'quote_quiet' : 'no_reply'] as ('no_reply' | 'quote_quiet')[] }))
    expect(nudgeLines(KASUNI.id, rows, [a, b, other], ctx)).toEqual(['Reply to Hilton (2 days)', 'Follow up on quote (2 days) for Kaos Night'])
  })
  it('is empty when the manager has nothing open', () => {
    expect(nudgeLines(KASUNI.id, [], [], ctx)).toEqual([])
  })
})
