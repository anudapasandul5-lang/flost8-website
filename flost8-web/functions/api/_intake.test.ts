import { describe, it, expect, vi, afterEach } from 'vitest'
import { mapBookingToInquiry, saveInquiry } from './_intake'

const payload = {
  type: 'booking',
  token: 'secret-turnstile-token',
  set_type: 'B2B',
  lineup_slugs: 'sonal,maalin',
  artist: 'sonal',
  event_name: 'NYE Bash',
  event_date: '2026-12-31',
  venue: 'The Factory',
  city: 'Colombo',
  event_type: 'NIGHT',
  set_duration_h: '3',
  organizer_name: 'Test',
  direct_number: '+94770000000',
  organizer_email: 'a@b.co',
  other_artists: '',
}

describe('mapBookingToInquiry', () => {
  it('maps form fields, keeps lineup order, drops the token from raw', () => {
    const { row, slugs } = mapBookingToInquiry(payload)
    expect(slugs).toEqual(['sonal', 'maalin'])
    expect(row.organizer_phone).toBe('+94770000000')
    expect(row.set_duration_h).toBe(3)
    expect(row.other_artists).toBeNull()
    expect(row.raw).not.toHaveProperty('token')
  })

  it('falls back to `artist` and nulls a bad date', () => {
    const { row, slugs } = mapBookingToInquiry({ ...payload, lineup_slugs: undefined, event_date: 'soon' })
    expect(slugs).toEqual(['sonal'])
    expect(row.event_date).toBeNull()
  })

  it('keeps only known slugs, de-duplicated, at most three', () => {
    const { slugs } = mapBookingToInquiry({ ...payload, lineup_slugs: 'sonal, ../x ,sonal,maalin,anush,imthxd,DROP TABLE' })
    expect(slugs).toEqual(['sonal', 'maalin', 'anush'])
    expect(mapBookingToInquiry({ ...payload, lineup_slugs: 'nope,;', artist: 'nope' }).slugs).toEqual([])
  })

  it('truncates long strings and drops unknown keys from raw', () => {
    const { row } = mapBookingToInquiry({
      ...payload,
      venue: 'v'.repeat(5000),
      other_artists: 'o'.repeat(5000),
      evil_blob: 'x'.repeat(100000),
      __proto__x: 'y',
    })
    expect(row.venue).toHaveLength(500)
    expect(row.other_artists).toHaveLength(2000)
    expect(row.raw).not.toHaveProperty('evil_blob')
    expect(row.raw).not.toHaveProperty('token')
    expect(JSON.stringify(row.raw).length).toBeLessThan(5000)
  })
})

describe('saveInquiry', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does nothing without Supabase secrets', async () => {
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    await saveInquiry({}, payload)
    expect(f).not.toHaveBeenCalled()
  })

  it('inserts the inquiry, then the lineup with positions', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'abc' }]), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', f)
    await saveInquiry({ SUPABASE_URL: 'https://x.supabase.co/', SUPABASE_SERVICE_ROLE_KEY: 'k' }, payload)
    expect(f.mock.calls[0][0]).toBe('https://x.supabase.co/rest/v1/inquiries?select=id')
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual([
      { inquiry_id: 'abc', position: 1, artist_slug: 'sonal' },
      { inquiry_id: 'abc', position: 2, artist_slug: 'maalin' },
    ])
  })

  it('throws when Supabase rejects, so the caller can log it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 401 })))
    await expect(
      saveInquiry({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }, payload),
    ).rejects.toThrow('401')
  })

  it('still stores the inquiry when no lineup slug is valid (no lineup call)', async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'abc' }]), { status: 201 }))
    vi.stubGlobal('fetch', f)
    await saveInquiry(
      { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' },
      { ...payload, lineup_slugs: 'bogus', artist: 'bogus' },
    )
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('errors carry status/id only, never the key or the response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"echo":"a@b.co +94770000000"}', { status: 409 })))
    const err = await saveInquiry(
      { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb-secret-key' },
      payload,
    ).catch(e => e as Error)
    expect(err.message).toBe('inquiries insert 409')
    expect(err.message).not.toContain('sb-secret-key')
  })
})
