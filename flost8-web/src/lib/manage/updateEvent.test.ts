import { beforeEach, expect, it, vi } from 'vitest'

const updates: Record<string, unknown>[] = []
vi.mock('./supabase', () => ({
  getSupabase: () => ({
    from: (table: string) => ({
      update: (patch: Record<string, unknown>) => {
        if (table === 'inquiries') updates.push(patch)
        return { eq: () => ({ select: async () => ({ data: [{ id: 'e1' }], error: null }) }) }
      },
      delete: () => ({ eq: async () => ({ error: null }) }),
      insert: async () => ({ error: null }),
      upsert: async () => ({ error: null }),
    }),
  }),
}))
import { updateEvent } from './api'
import type { NewEventInput } from './newEvent'

const input: NewEventInput = {
  name: 'Atmosphere', date: '2025-09-12', venue: 'ITC Colombo', city: '', setTime: '', status: 'booking_confirmed', organizer: 'Zane',
  phone: '', email: '', fee: '150000', currency: 'LKR', artists: ['dr-green'], contactId: null, ticketLink: '',
}

beforeEach(() => { updates.length = 0 })

// The database skips an UPDATE that changes nothing (a0_suppress_redundant) and reports zero rows, which the app reads as
// "not allowed". Saving only a new fee changes no inquiry column, so every save has to carry a fresh updated_at.
it('every save carries a fresh updated_at, so a money-only edit is not mistaken for a refused write', async () => {
  await updateEvent('e1', input, null)
  await new Promise((r) => setTimeout(r, 5))
  await updateEvent('e1', input, null)
  expect(updates).toHaveLength(2)
  expect(typeof updates[0].updated_at).toBe('string')
  expect(updates[0].updated_at).not.toBe(updates[1].updated_at)
})
