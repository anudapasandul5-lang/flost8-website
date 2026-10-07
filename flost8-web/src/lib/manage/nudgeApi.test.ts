import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const from = vi.fn()
vi.mock('./supabase', () => ({ getSupabase: () => ({ rpc, from }) }))
import { fetchManagerWhatsapps, nudgeErrorText, setManagerWhatsapp } from './nudgeApi'

beforeEach(() => vi.clearAllMocks())

describe('fetchManagerWhatsapps', () => {
  it('maps manager id to number via the owner-only rpc, never the managers table', async () => {
    rpc.mockResolvedValue({ data: [{ manager_id: 'm1', whatsapp: '+94771234567' }], error: null })
    const m = await fetchManagerWhatsapps()
    expect(rpc).toHaveBeenCalledWith('manager_whatsapps')
    expect(from).not.toHaveBeenCalled()
    expect(m.get('m1')).toBe('+94771234567')
  })
  it('treats a permission error (not the owner) as no numbers', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied for function manager_whatsapps' } })
    expect((await fetchManagerWhatsapps()).size).toBe(0)
  })
  it('treats a missing function (migration not applied yet) as no numbers', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.manager_whatsapps' } })
    expect((await fetchManagerWhatsapps()).size).toBe(0)
  })
  it('lets other failures through', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'boom' } })
    await expect(fetchManagerWhatsapps()).rejects.toMatchObject({ message: 'boom' })
  })
})

describe('setManagerWhatsapp', () => {
  it('sends the normalised number', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await setManagerWhatsapp('m1', '+94 77 123 4567')
    expect(rpc).toHaveBeenCalledWith('set_manager_whatsapp', { p_manager: 'm1', p_whatsapp: '+94771234567' })
  })
  it('null clears the number', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await setManagerWhatsapp('m1', null)
    expect(rpc).toHaveBeenCalledWith('set_manager_whatsapp', { p_manager: 'm1', p_whatsapp: null })
  })
  it('refuses a bad number without calling the database', async () => {
    await expect(setManagerWhatsapp('m1', '12ab')).rejects.toThrow(/7 to 15 digits/)
    expect(rpc).not.toHaveBeenCalled()
  })
  it('throws the database error', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'nope' } })
    await expect(setManagerWhatsapp('m1', '0771234567')).rejects.toMatchObject({ code: '42501' })
  })
})

describe('nudgeErrorText', () => {
  it('speaks plain English', async () => {
    const bad = await setManagerWhatsapp('m1', 'abc').catch((e: unknown) => e)
    expect(nudgeErrorText(bad)).toMatch(/7 to 15 digits/)
    expect(nudgeErrorText({ code: '42501', message: 'x' })).toMatch(/owner/i)
    expect(nudgeErrorText({ code: 'PGRST202', message: 'x' })).toMatch(/not switched on/i)
    expect(nudgeErrorText(new Error('Failed to fetch'))).toMatch(/internet/i)
  })
})
