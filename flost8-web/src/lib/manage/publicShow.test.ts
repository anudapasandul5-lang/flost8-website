import { describe, expect, it } from 'vitest'
import { makeInquiry } from './testFixtures'
import { alreadySynced, toShow } from './publicShow'

const artists = [{ slug: 'dr-green', name: 'DR. GREEN', manager_id: null }, { slug: 'sonal', name: 'SONAL', manager_id: null }]
const event = makeInquiry({ source: 'manual', status: 'booking_confirmed', artists: ['dr-green', 'sonal'], set_time: '10 pm', notes: 'PRIVATE', organizer_phone: 'PRIVATE', organizer_name: 'PRIVATE' })
describe('public show contract', () => {
  it('publishes exactly the public fields and the ordered B2B names', () => {
    expect(toShow(event, artists)).toEqual({ date: '2026-11-14', time: '10 pm', venue: 'Test Night', city: 'Colombo', artist: 'dr-green', artist_display: 'DR. GREEN B2B SONAL', ticket_link: '' })
    expect(JSON.stringify(toShow(event, artists))).not.toContain('PRIVATE')
  })
  it.each(['new', 'tentative', 'quoted', 'reached_out', 'lost', 'spam'] as const)('never publishes %s', status => {
    expect(toShow({ ...event, status }, artists)).toBeNull()
  })
  it('accepts deposits but rejects non-manual sources and incomplete or invalid dates', () => {
    expect(toShow({ ...event, status: 'deposit_paid' }, artists)).not.toBeNull()
    for (const patch of [{ source: 'website' }, { source: 'sheet_import' }, { event_date: null }, { event_date: '2026-02-30' }, { event_date: '2026-99-99' }, { artists: ['unknown'] }, { city: '' }]) {
      expect(toShow({ ...event, ...patch }, artists)).toBeNull()
    }
  })
  it('only exports valid short http(s) ticket links', () => {
    expect(toShow({ ...event, ticket_link: ' https://tickets.example/a ' }, artists)?.ticket_link).toBe('https://tickets.example/a')
    for (const ticket_link of ['javascript:alert(1)', 'https://', 'https://tickets.example/' + 'x'.repeat(2000)]) {
      expect(toShow({ ...event, ticket_link }, artists)?.ticket_link).toBe('')
    }
  })
  it('recognises a synced B2B member on the same date, never a manual row or another date', () => {
    const show = toShow(event, artists)!
    expect(alreadySynced(show, [{ ...show, id: 'sync:night', artist: 'sonal', artist_display: 'SONAL' }])).toBe(true)
    expect(alreadySynced(show, [{ ...show, id: 'uuid' }])).toBe(false)
    expect(alreadySynced(show, [{ ...show, id: 'sync:other', date: '2026-11-15' }])).toBe(false)
  })
})
