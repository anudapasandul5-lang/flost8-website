import { describe, it, expect } from 'vitest'
import { EMPTY_EVENT, moneyForEdit, ownerFor, toEditInput, toEditPatch, toInquiryRow, toMoneyRow, validateNewEvent, type NewEventInput } from './newEvent'
import { KASUNI, OWNER, makeInquiry } from './testFixtures'

const ok: NewEventInput = {
  ...EMPTY_EVENT,
  artists: ['dr-green'],
  date: '2026-10-17',
  name: 'Skyline Rooftop Session',
  venue: 'Cloud Nine',
  city: 'Colombo',
  fee: '120,000',
  organizer: 'Dinesh',
  phone: '077 555 0192',
}

describe('validateNewEvent', () => {
  it('rejects unsafe or oversized ticket links and persists valid links through edits', () => {
    expect(validateNewEvent({ ...ok, ticketLink: 'javascript:alert(1)' })).toMatch(/ticket/i)
    expect(validateNewEvent({ ...ok, ticketLink: 'https://x.test/' + 'x'.repeat(2000) })).toMatch(/ticket/i)
    expect(toInquiryRow({ ...ok, ticketLink: ' https://tickets.test/a ' }, null).ticket_link).toBe('https://tickets.test/a')
    expect(toEditPatch({ ...ok, ticketLink: '' }).ticket_link).toBeNull()
    expect(toEditInput(makeInquiry({ ticket_link: 'https://tickets.test/a' })).ticketLink).toBe('https://tickets.test/a')
  })
  it('accepts a complete entry', () => {
    expect(validateNewEvent(ok)).toBeNull()
  })
  it('needs an artist, a real date, and a name or a venue', () => {
    expect(validateNewEvent({ ...ok, artists: [] })).toMatch(/artist/i)
    expect(validateNewEvent({ ...ok, date: '' })).toMatch(/date/i)
    expect(validateNewEvent({ ...ok, date: '17/10/2026' })).toMatch(/date/i)
    expect(validateNewEvent({ ...ok, name: ' ', venue: '' })).toMatch(/name or a venue/i)
    expect(validateNewEvent({ ...ok, name: '', venue: 'Cloud Nine' })).toBeNull()
  })
  it('rejects a fee that is not a number, allows it blank', () => {
    expect(validateNewEvent({ ...ok, fee: 'lots' })).toMatch(/fee/i)
    expect(validateNewEvent({ ...ok, fee: '' })).toBeNull()
    expect(validateNewEvent({ ...ok, fee: '-5' })).toMatch(/negative/i)
  })
})

describe('toInquiryRow', () => {
  it('maps to the table columns: trimmed, blanks as null, marked as added in the app', () => {
    expect(toInquiryRow({ ...ok, name: '  Skyline  ', city: '', setTime: ' 10 pm ' }, 'm-kasuni')).toEqual({
      source: 'manual',
      status: 'booking_confirmed',
      owner_id: 'm-kasuni',
      event_name: 'Skyline',
      event_date: '2026-10-17',
      venue: 'Cloud Nine',
      city: null,
      set_time: '10 pm',
      organizer_name: 'Dinesh',
      organizer_phone: '077 555 0192',
      organizer_email: null,
      contact_id: null,
      ticket_link: null,
    })
  })
  it('keeps the chosen status', () => {
    expect(toInquiryRow({ ...ok, status: 'quoted' }, null).status).toBe('quoted')
  })
})

describe('picking a contact', () => {
  it('writes the link and copies the email onto the inquiry', () => {
    const row = toInquiryRow({ ...ok, contactId: 'c-1', email: ' r@club.test ' }, 'm-kasuni')
    expect(row.contact_id).toBe('c-1')
    expect(row.organizer_email).toBe('r@club.test')
  })
  it('an edit can change or clear the link', () => {
    expect(toEditPatch({ ...ok, contactId: 'c-2' }).contact_id).toBe('c-2')
    expect(toEditPatch({ ...ok, contactId: null }).contact_id).toBeNull()
  })
})

describe('toMoneyRow', () => {
  it('is null without a fee', () => {
    expect(toMoneyRow({ ...ok, fee: '' })).toBeNull()
  })
  it('treats the whole fee as still owed, since nothing has been paid yet', () => {
    expect(toMoneyRow({ ...ok, currency: 'USD', fee: '1,200' })).toEqual({
      currency: 'USD', fee: 1200, advance: null, balance: 1200, balance_note: null, total: null, booking_fee: null,
    })
  })
})

describe('ownerFor', () => {
  const artists = [
    { slug: 'dr-green', name: 'Dr. Green', manager_id: 'm-kasuni' },
    { slug: 'anush', name: 'Anush', manager_id: 'm-nirb' },
  ]
  it('a manager owns what they add', () => {
    expect(ownerFor(['dr-green'], KASUNI, artists)).toBe(KASUNI.id)
  })
  it("the owner role gives it to the first artist's manager", () => {
    expect(ownerFor(['anush', 'dr-green'], OWNER, artists)).toBe('m-nirb')
  })
  it('the owner role leaves it unassigned when the artist has no manager', () => {
    expect(ownerFor(['ghost'], OWNER, artists)).toBeNull()
  })
})

describe('editing an added event', () => {
  const money = { currency: 'LKR' as const, fee: 100000, advance: 40000, balance: 60000, balance_note: 'cash', total: null, booking_fee: null }
  const inq = makeInquiry({
    source: 'manual',
    event_name: 'Skyline',
    event_date: '2026-10-17',
    venue: 'Cloud Nine',
    city: null,
    set_time: '10:00 pm',
    organizer_name: 'Dinesh',
    organizer_phone: '0775550192',
    artists: ['dr-green', 'anush'],
    money,
  })

  it('toEditInput puts the saved event back into the form, blanks as empty strings', () => {
    expect(toEditInput(inq)).toMatchObject({
      artists: ['dr-green', 'anush'],
      date: '2026-10-17',
      name: 'Skyline',
      venue: 'Cloud Nine',
      city: '',
      setTime: '10:00 pm',
      fee: '100000',
      currency: 'LKR',
      organizer: 'Dinesh',
      phone: '0775550192',
    })
    expect(toEditInput({ ...inq, money: null }).fee).toBe('')
  })

  it('toEditPatch never touches source, status or owner', () => {
    const patch = toEditPatch({ ...toEditInput(inq), name: '  New name ', city: '' })
    expect(patch).toEqual({
      event_name: 'New name',
      event_date: '2026-10-17',
      venue: 'Cloud Nine',
      city: null,
      set_time: '10:00 pm',
      organizer_name: 'Dinesh',
      organizer_phone: '0775550192',
      organizer_email: null,
      contact_id: null,
      ticket_link: null,
    })
    expect(patch).not.toHaveProperty('source')
    expect(patch).not.toHaveProperty('status')
    expect(patch).not.toHaveProperty('owner_id')
  })

  it('a new fee keeps what was already paid and recomputes the balance', () => {
    expect(moneyForEdit({ ...toEditInput(inq), fee: '120,000' }, money)).toEqual({ ...money, fee: 120000, balance: 80000 })
  })
  it('a paid event stays paid when the fee is unchanged', () => {
    const paid = { ...money, advance: 100000, balance: 0 }
    expect(moneyForEdit(toEditInput({ ...inq, money: paid }), paid)).toEqual(paid)
  })
  it('changes the currency without touching the amounts', () => {
    expect(moneyForEdit({ ...toEditInput(inq), currency: 'USD' }, money)).toEqual({ ...money, currency: 'USD' })
  })
  it('first fee on an event with no money row: whole fee is owed', () => {
    expect(moneyForEdit({ ...ok, fee: '5000' }, null)).toMatchObject({ currency: 'LKR', fee: 5000, advance: null, balance: 5000 })
  })
  it('a blank fee leaves the money alone', () => {
    expect(moneyForEdit({ ...toEditInput(inq), fee: '' }, money)).toBeNull()
  })
  it('never lets the balance go negative', () => {
    expect(moneyForEdit({ ...toEditInput(inq), fee: '30000' }, money)?.balance).toBe(0)
  })
})
