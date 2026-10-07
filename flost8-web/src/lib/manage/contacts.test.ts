import { describe, expect, it } from 'vitest'
import {
  bestPhone, bookingsOf, contextBooking, describeContactHistory, cleanInstagram, defaultsFromContact, contactStage, duplicateGroups, emailKey, fillTemplate, filterContacts, findDuplicates, lifetimeValue,
  normName, pendingPayments, phoneKey, quietContacts, reminderBucket, searchContacts, toContactInput, toContactRow, validateContact,
  EMPTY_CONTACT, type Contact, type ContactFilter, type ContactStats,
} from './contacts'
import { makeInquiry } from './testFixtures'

const c = (over: Partial<Contact> = {}): Contact => ({
  id: 'c1', name: 'Ruwan Perera', types: ['client'], phones: [], whatsapp: null, emails: [], organisation: null, city: null,
  instagram: null, language: null, owner_id: null, notes: null, created_by: null, created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z', deleted_at: null, deleted_by: null, merged_into: null, ...over,
})
const st = (over: Partial<ContactStats> = {}): ContactStats => ({
  contact_id: 'c1', any_count: 0, booked_count: 0, next_booked_date: null, last_booked_date: null, last_inquiry_touch: null, last_note_at: null, ...over,
})
const TODAY = '2026-10-07'

describe('keys', () => {
  it('normName ignores case, spacing and stray punctuation spacing', () => {
    expect(normName('  Ruwan   PERERA ')).toBe('ruwan perera')
  })
  it('phoneKey makes the same Sri Lankan number match in every common spelling', () => {
    const keys = ['0771234567', '077 123 4567', '+94 77 123 4567', '0094771234567', '94771234567', '077-123-4567'].map(phoneKey)
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).toBe('771234567')
  })
  it('phoneKey is empty for something that is not a number', () => {
    expect(phoneKey('call me')).toBe('')
    expect(phoneKey('123')).toBe('')
  })
  it('emailKey lowercases and trims', () => expect(emailKey('  Ruwan@Club.TEST ')).toBe('ruwan@club.test'))
})

describe('cleanInstagram', () => {
  it.each([
    ['@dj_flost8', 'dj_flost8'],
    ['https://www.instagram.com/dj_flost8/', 'dj_flost8'],
    ['instagram.com/dj.flost8?igsh=abc', 'dj.flost8'],
    ['  flost8 ', 'flost8'],
    ['', ''],
  ])('%s -> %s', (input, out) => expect(cleanInstagram(input)).toBe(out))
})

describe('validateContact / toContactRow', () => {
  const good = { ...EMPTY_CONTACT, name: ' Ruwan Perera ', types: ['client' as const], phones: ['077 123 4567', '0771234567', ''], emails: ['R@club.test'] }
  it('accepts a normal contact', () => expect(validateContact(good)).toBeNull())
  it('needs a name', () => expect(validateContact({ ...good, name: '  ' })).toMatch(/name/i))
  it('refuses a phone that is not a number', () => expect(validateContact({ ...good, phones: ['call me'] })).toMatch(/phone/i))
  it('refuses a mailto-injection style email', () => expect(validateContact({ ...good, emails: ['a@b.com?bcc=x@y.com'] })).toMatch(/email/i))
  it('refuses an instagram handle with spaces', () => expect(validateContact({ ...good, instagram: 'a b c' })).toMatch(/instagram/i))
  it('row is trimmed, de-duplicated by number, blanks dropped', () => {
    const row = toContactRow(good)
    expect(row.name).toBe('Ruwan Perera')
    expect(row.phones).toEqual(['077 123 4567'])
    expect(row.emails).toEqual(['r@club.test'])
    expect(row.whatsapp).toBeNull()
    expect(row.instagram).toBeNull()
  })
  it('round-trips through the form shape', () => {
    const contact = c({ phones: ['0771234567'], emails: ['a@b.lk'], instagram: 'flost8', owner_id: 'm1', notes: 'hi' })
    expect(toContactRow(toContactInput(contact))).toMatchObject({ name: 'Ruwan Perera', phones: ['0771234567'], emails: ['a@b.lk'], instagram: 'flost8', owner_id: 'm1', notes: 'hi' })
  })
})

describe('duplicates', () => {
  const list = [
    c({ id: 'a', name: 'Ruwan Perera', phones: ['0771234567'] }),
    c({ id: 'b', name: 'R. Perera', phones: ['+94 77 123 4567'] }),
    c({ id: 'd', name: 'ruwan  perera', emails: ['x@y.lk'] }),
    c({ id: 'e', name: 'Nimal', emails: ['X@y.lk'] }),
    c({ id: 'f', name: 'Someone else', phones: ['0719999999'] }),
    c({ id: 'g', name: 'Deleted twin', phones: ['0771234567'], deleted_at: '2026-10-01T00:00:00Z' }),
  ]
  it('finds a match by phone, by email, or by same name', () => {
    expect(findDuplicates({ name: 'Ruwan Perera', phones: [], emails: [] }, list).map((x) => x.id).sort()).toEqual(['a', 'd'])
    expect(findDuplicates({ name: 'New person', phones: ['077-123-4567'], emails: [] }, list).map((x) => x.id).sort()).toEqual(['a', 'b'])
    expect(findDuplicates({ name: 'New person', phones: [], emails: ['x@Y.lk'] }, list).map((x) => x.id).sort()).toEqual(['d', 'e'])
  })
  it('ignores deleted contacts and the contact being edited', () => {
    expect(findDuplicates({ name: 'x', phones: ['0771234567'], emails: [] }, list, 'a').map((x) => x.id)).toEqual(['b'])
  })
  it('groups possible duplicates for the merge screen (transitively), never singles', () => {
    const groups = duplicateGroups(list).map((g) => g.map((x) => x.id).sort())
    expect(groups).toEqual([['a', 'b', 'd', 'e']])
  })
})

describe('contactStage', () => {
  it('upcoming booking = active', () => expect(contactStage(c(), st({ next_booked_date: '2026-11-01', booked_count: 1 }), TODAY)).toBe('active'))
  it('booked before, touched recently = past', () =>
    expect(contactStage(c(), st({ booked_count: 2, last_booked_date: '2026-09-01' }), TODAY)).toBe('past'))
  it('no bookings yet, recent = lead', () => expect(contactStage(c(), st({ any_count: 1, last_inquiry_touch: '2026-10-01T00:00:00Z' }), TODAY)).toBe('lead'))
  it('a brand-new contact with no stats is a lead', () => expect(contactStage(c({ created_at: '2026-10-05T00:00:00Z' }), undefined, TODAY)).toBe('lead'))
  it('quiet for more than 90 days = dormant', () =>
    expect(contactStage(c(), st({ booked_count: 1, last_booked_date: '2026-06-01' }), TODAY)).toBe('dormant'))
  it('exactly 90 days is not yet dormant, 91 is', () => {
    expect(contactStage(c(), st({ booked_count: 1, last_booked_date: '2026-07-09' }), TODAY)).toBe('past')
    expect(contactStage(c(), st({ booked_count: 1, last_booked_date: '2026-07-08' }), TODAY)).toBe('dormant')
  })
  it('a logged note resets the clock', () =>
    expect(contactStage(c(), st({ booked_count: 1, last_booked_date: '2026-03-01', last_note_at: '2026-10-01T09:00:00Z' }), TODAY)).toBe('past'))
  it('with no signal at all it falls back to when the contact was created', () => {
    expect(contactStage(c({ created_at: '2026-01-01T00:00:00Z' }), st(), TODAY)).toBe('dormant')
  })
})

describe('search and filters', () => {
  const list = [
    c({ id: 'a', name: 'Ruwan Perera', organisation: 'Club X', phones: ['077 123 4567'], types: ['client'], owner_id: 'm1' }),
    c({ id: 'b', name: 'Nimali', city: 'Kandy', emails: ['nimali@venue.lk'], instagram: 'nimali.events', types: ['venue', 'promoter'], owner_id: 'm2' }),
    c({ id: 'd', name: 'Deleted', deleted_at: '2026-10-01T00:00:00Z' }),
  ]
  it('matches name, organisation, city, handle and email, any case', () => {
    expect(searchContacts(list, 'club x').map((x) => x.id)).toEqual(['a'])
    expect(searchContacts(list, 'KANDY').map((x) => x.id)).toEqual(['b'])
    expect(searchContacts(list, 'nimali.events').map((x) => x.id)).toEqual(['b'])
    expect(searchContacts(list, 'venue.lk').map((x) => x.id)).toEqual(['b'])
  })
  it('matches a phone in any spelling', () => {
    expect(searchContacts(list, '0771234567').map((x) => x.id)).toEqual(['a'])
    expect(searchContacts(list, '+94 77 123').map((x) => x.id)).toEqual(['a'])
  })
  it('every word must match', () => expect(searchContacts(list, 'ruwan kandy')).toEqual([]))
  it('empty search returns everything', () => expect(searchContacts(list, '  ')).toHaveLength(3))
  it('filters by type, owner and stage and hides deleted contacts', () => {
    const stats = new Map([['a', st({ contact_id: 'a', next_booked_date: '2026-11-01', booked_count: 1 })]])
    const base: ContactFilter = { q: '', type: '', ownerId: '', stage: '', stats, today: TODAY }
    expect(filterContacts(list, base).map((x) => x.id)).toEqual(['a', 'b'])
    expect(filterContacts(list, { ...base, type: 'promoter' }).map((x) => x.id)).toEqual(['b'])
    expect(filterContacts(list, { ...base, ownerId: 'm1' }).map((x) => x.id)).toEqual(['a'])
    expect(filterContacts(list, { ...base, stage: 'active' }).map((x) => x.id)).toEqual(['a'])
  })
})

describe('lifetimeValue', () => {
  it('adds the fee of booked and deposit-paid events, per currency, only where money is visible', () => {
    const v = lifetimeValue([
      makeInquiry({ status: 'booking_confirmed', money: { currency: 'LKR', fee: 100000, advance: null, balance: 100000, balance_note: null, total: null, booking_fee: null } }),
      makeInquiry({ status: 'deposit_paid', money: { currency: 'LKR', fee: 50000, advance: 10000, balance: 40000, balance_note: null, total: null, booking_fee: null } }),
      makeInquiry({ status: 'booking_confirmed', money: { currency: 'USD', fee: 300, advance: null, balance: 300, balance_note: null, total: null, booking_fee: null } }),
      makeInquiry({ status: 'quoted', money: { currency: 'LKR', fee: 999, advance: null, balance: 999, balance_note: null, total: null, booking_fee: null } }),
      makeInquiry({ status: 'booking_confirmed', money: null }),
    ])
    expect(v).toEqual({ LKR: 150000, USD: 300 })
  })
  it('is empty when nothing is visible', () => expect(lifetimeValue([makeInquiry({ status: 'booking_confirmed' })])).toEqual({}))
})

describe('fillTemplate', () => {
  const vars = { name: 'Ruwan', date: '2026-12-05', venue: 'Cloud Nine', event: 'NYE Bash', me: 'Kasuni' }
  it('fills every placeholder and formats the date', () =>
    expect(fillTemplate('Hi {name}, {event} at {venue} on {date}. - {me}', vars)).toBe('Hi Ruwan, NYE Bash at Cloud Nine on 5 Dec 2026. - Kasuni'))
  it('uses plain fallbacks instead of leaving {braces} in a message', () =>
    expect(fillTemplate('Hi {name}, about {event} on {date} at {venue}', { me: 'K' })).toBe('Hi there, about the event on the date at the venue'))
  it('leaves unknown braces alone', () => expect(fillTemplate('Total {amount}', vars)).toBe('Total {amount}'))
  it('replaces every occurrence', () => expect(fillTemplate('{name} {name}', vars)).toBe('Ruwan Ruwan'))
})

describe('bestPhone', () => {
  it('prefers the WhatsApp number, then the first phone', () => {
    expect(bestPhone(c({ whatsapp: '0711111111', phones: ['0772222222'] }))).toBe('0711111111')
    expect(bestPhone(c({ phones: ['0772222222'] }))).toBe('0772222222')
    expect(bestPhone(c())).toBeNull()
  })
})

describe('reminderBucket', () => {
  const r = (due_at: string, done = false) => ({ id: 'r', inquiry_id: null, contact_id: 'c1', manager_id: 'm1', due_at, note: null, done, done_at: null, created_at: '2026-10-01T00:00:00Z' })
  it('sorts a reminder by its due date against today', () => {
    expect(reminderBucket(r('2026-10-06T12:00:00Z'), TODAY)).toBe('overdue')
    expect(reminderBucket(r('2026-10-07T12:00:00Z'), TODAY)).toBe('today')
    expect(reminderBucket(r('2026-10-08T12:00:00Z'), TODAY)).toBe('later')
    expect(reminderBucket(r('2026-10-01T12:00:00Z', true), TODAY)).toBe('done')
  })
})

describe('pendingPayments', () => {
  const money = (balance: number | null) => ({ currency: 'LKR' as const, fee: 100000, advance: 0, balance, balance_note: null, total: null, booking_fee: null })
  it('shows the amount where money is visible, a plain flag where it is not', () => {
    const rows = pendingPayments(
      [
        makeInquiry({ id: 'visible', status: 'booking_confirmed', event_date: '2026-10-20', money: money(60000) }),
        makeInquiry({ id: 'hidden', status: 'booking_confirmed', event_date: '2026-10-21', money: null }),
        makeInquiry({ id: 'paid', status: 'booking_confirmed', event_date: '2026-10-22', money: money(0) }),
        makeInquiry({ id: 'far', status: 'booking_confirmed', event_date: '2027-03-01', money: money(1) }),
        makeInquiry({ id: 'quote', status: 'quoted', event_date: '2026-10-20', money: money(5) }),
        makeInquiry({ id: 'deposit-hidden', status: 'deposit_paid', event_date: '2026-10-23', money: null }),
      ],
      TODAY,
    )
    expect(rows.map((r) => [r.inquiry.id, r.amount])).toEqual([['visible', 60000], ['hidden', null]])
  })
  it('puts an unpaid show that already happened first, as overdue', () => {
    const rows = pendingPayments([makeInquiry({ id: 'old', status: 'deposit_paid', event_date: '2026-10-01', money: money(25000) }), makeInquiry({ id: 'soon', status: 'booking_confirmed', event_date: '2026-10-09', money: money(10000) })], TODAY)
    expect(rows.map((r) => [r.inquiry.id, r.overdue])).toEqual([['old', true], ['soon', false]])
  })
})

describe('quietContacts', () => {
  const list = [
    c({ id: 'a', name: 'A', owner_id: 'm1' }),
    c({ id: 'b', name: 'B', owner_id: 'm2' }),
    c({ id: 'd', name: 'D', owner_id: 'm1' }),
    c({ id: 'e', name: 'E', owner_id: 'm1', deleted_at: '2026-10-01T00:00:00Z' }),
  ]
  const stats = new Map<string, ContactStats>([
    ['a', st({ contact_id: 'a', booked_count: 2, last_booked_date: '2026-05-01' })],
    ['b', st({ contact_id: 'b', booked_count: 1, last_booked_date: '2026-04-01' })],
    ['d', st({ contact_id: 'd', booked_count: 0, any_count: 1, last_inquiry_touch: '2026-01-01T00:00:00Z' })],
    ['e', st({ contact_id: 'e', booked_count: 1, last_booked_date: '2026-01-01' })],
  ])
  it("lists people who booked before and went quiet, for the owner's own contacts, most recently lapsed first", () => {
    expect(quietContacts(list, stats, TODAY, 'm1').map((x) => x.id)).toEqual(['a'])
  })
  it('the owner role passes null and sees everyone', () => {
    expect(quietContacts(list, stats, TODAY, null).map((x) => x.id)).toEqual(['a', 'b'])
  })
})

describe('Add Event shortcuts', () => {
  it('bookingsOf returns the contact bookings newest first', () => {
    const list = [
      makeInquiry({ id: 'x', contact_id: 'c1', event_date: '2026-01-01' }),
      makeInquiry({ id: 'y', contact_id: 'c2', event_date: '2026-12-01' }),
      makeInquiry({ id: 'z', contact_id: 'c1', event_date: '2026-06-01' }),
      makeInquiry({ id: 'u', contact_id: 'c1', event_date: null }),
    ]
    expect(bookingsOf('c1', list).map((i) => i.id)).toEqual(['z', 'x', 'u'])
  })
  it('defaults come from the last real booking, skipping lost ones, and city prefers the contact card', () => {
    const list = [
      makeInquiry({ id: 'lost', contact_id: 'c1', event_date: '2026-09-01', status: 'lost', city: 'Galle', artists: ['sonal'] }),
      makeInquiry({ id: 'last', contact_id: 'c1', event_date: '2026-06-01', status: 'booking_confirmed', city: 'Kandy', venue: 'Cloud 9', artists: ['anush', 'imthxd'] }),
    ]
    expect(defaultsFromContact(c(), list)).toEqual({ city: 'Kandy', artists: ['anush', 'imthxd'], venue: 'Cloud 9' })
    expect(defaultsFromContact(c({ city: 'Colombo' }), list).city).toBe('Colombo')
    expect(defaultsFromContact(c({ id: 'nobody' }), list)).toEqual({ city: '', artists: [], venue: '' })
  })
})

describe('describeContactHistory', () => {
  const row = (kind: string, data: Record<string, unknown> = {}) => ({ id: 1, contact_id: 'c1', actor_id: null, kind, data, created_at: '2026-10-01T00:00:00Z' })
  it('reads in plain English', () => {
    expect(describeContactHistory(row('created'))).toBe('Contact created')
    expect(describeContactHistory(row('edited', { phones: {}, owner_id: {}, notes: {} }))).toBe('Changed phone numbers, owner, notes')
    expect(describeContactHistory(row('deleted'))).toBe('Moved to Trash')
    expect(describeContactHistory(row('merged', { merged: [{}, {}] }))).toBe('Merged 2 contacts into this one')
    expect(describeContactHistory(row('merged', { merged: [{}], undone: true }))).toBe('Merged 1 contact into this one (undone)')
  })
})

describe('contextBooking', () => {
  const list = [
    makeInquiry({ id: 'past', contact_id: 'c1', event_date: '2026-06-01' }),
    makeInquiry({ id: 'later', contact_id: 'c1', event_date: '2026-12-01' }),
    makeInquiry({ id: 'soon', contact_id: 'c1', event_date: '2026-10-20' }),
    makeInquiry({ id: 'lost', contact_id: 'c1', event_date: '2026-10-09', status: 'lost' }),
  ]
  it('picks the soonest upcoming booking, never a lost one', () => expect(contextBooking('c1', list, TODAY)?.id).toBe('soon'))
  it('falls back to the latest booking when none is upcoming', () => expect(contextBooking('c1', list, '2027-01-01')?.id).toBe('later'))
  it('is undefined for a contact with no bookings', () => expect(contextBooking('nobody', list, TODAY)).toBeUndefined())
})
