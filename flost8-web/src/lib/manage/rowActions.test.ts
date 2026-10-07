import { describe, expect, it } from 'vitest'
import { NotAllowedError } from './api'
import { bulkSummary, canSetStatus, duplicateInput, runBulk } from './rowActions'
import { KASUNI, makeInquiry, OWNER } from './testFixtures'

describe('canSetStatus', () => {
  it('is allowed on website and app-added rows the person may edit', () => {
    expect(canSetStatus(makeInquiry({ source: 'website', owner_id: KASUNI.id }), KASUNI)).toBe(true)
    expect(canSetStatus(makeInquiry({ source: 'manual', owner_id: KASUNI.id }), KASUNI)).toBe(true)
    expect(canSetStatus(makeInquiry({ source: 'website', owner_id: null }), KASUNI)).toBe(true)
  })
  it('is never allowed on sheet rows, not even for the owner', () => {
    expect(canSetStatus(makeInquiry({ source: 'sheet_import', owner_id: KASUNI.id }), KASUNI)).toBe(false)
    expect(canSetStatus(makeInquiry({ source: 'sheet_import' }), OWNER)).toBe(false)
  })
  it("is not allowed on another manager's row", () => {
    expect(canSetStatus(makeInquiry({ source: 'website', owner_id: 'm-other' }), KASUNI)).toBe(false)
    expect(canSetStatus(makeInquiry({ source: 'website', owner_id: 'm-other' }), OWNER)).toBe(true)
  })
})

describe('duplicateInput', () => {
  const src = makeInquiry({
    event_name: 'Club Night', venue: 'The Factory', city: 'Colombo', set_time: '10pm', organizer_name: 'Ishara', organizer_phone: '0771234567',
    organizer_email: 'i@x.lk', contact_id: 'c1', ticket_link: 'https://t.example/x', artists: ['dr-green', 'sonal'], status: 'booking_confirmed',
    money: { currency: 'USD', fee: 500, advance: 100, balance: 400, balance_note: null, total: null, booking_fee: null },
  })
  it('copies the event but leaves the date blank', () => {
    const d = duplicateInput(src, new Set(['dr-green', 'sonal']))
    expect(d.date).toBe('')
    expect(d).toMatchObject({ name: 'Club Night', venue: 'The Factory', city: 'Colombo', setTime: '10pm', organizer: 'Ishara', phone: '0771234567', email: 'i@x.lk', contactId: 'c1', artists: ['dr-green', 'sonal'], fee: '500', currency: 'USD' })
  })
  it('does not copy the ticket link (it belongs to the old date)', () => {
    expect(duplicateInput(src, null).ticketLink).toBe('')
  })
  it('keeps only artists the person may pick', () => {
    expect(duplicateInput(src, new Set(['sonal'])).artists).toEqual(['sonal'])
  })
  it('falls back to a starting status for rows that are lost, spam or still a plain enquiry step', () => {
    expect(duplicateInput(makeInquiry({ status: 'lost' }), null).status).toBe('tentative')
    expect(duplicateInput(makeInquiry({ status: 'spam' }), null).status).toBe('tentative')
    expect(duplicateInput(makeInquiry({ status: 'reached_out' }), null).status).toBe('new')
    expect(duplicateInput(src, null).status).toBe('booking_confirmed')
  })
})

describe('runBulk', () => {
  it('runs one by one and counts partial failure', async () => {
    const seen: string[] = []
    const r = await runBulk(['a', 'b', 'c', 'd'], async (id) => {
      seen.push(id)
      if (id === 'c') throw new NotAllowedError()
      if (id === 'd') throw new Error('boom')
    })
    expect(seen).toEqual(['a', 'b', 'c', 'd'])
    expect(r).toEqual({ total: 4, done: ['a', 'b'], notAllowed: ['c'], failed: ['d'] })
  })
  it('keeps going after a failure', async () => {
    const r = await runBulk(['a', 'b'], async (id) => {
      if (id === 'a') throw new NotAllowedError()
    })
    expect(r.done).toEqual(['b'])
  })
})

describe('bulkSummary', () => {
  it('says 7 of 8 updated, 1 not allowed', () => {
    expect(bulkSummary({ total: 8, done: Array(7).fill('x'), notAllowed: ['y'], failed: [] }, 'updated')).toBe('7 of 8 updated, 1 not allowed')
  })
  it('lists other failures in plain words', () => {
    expect(bulkSummary({ total: 8, done: Array(5).fill('x'), notAllowed: ['y', 'z'], failed: ['q'] }, 'updated')).toBe('5 of 8 updated, 2 not allowed, 1 failed')
  })
  it('is plain when everything worked', () => {
    expect(bulkSummary({ total: 3, done: ['a', 'b', 'c'], notAllowed: [], failed: [] }, 'updated')).toBe('3 updated')
    expect(bulkSummary({ total: 1, done: ['a'], notAllowed: [], failed: [] }, 'updated')).toBe('1 updated')
  })
  it('says so when nothing worked', () => {
    expect(bulkSummary({ total: 2, done: [], notAllowed: ['a', 'b'], failed: [] }, 'updated')).toBe('0 of 2 updated, 2 not allowed')
  })
})
