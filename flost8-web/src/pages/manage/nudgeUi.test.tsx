import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const from = vi.fn()
vi.mock('../../lib/manage/supabase', () => ({ getSupabase: () => ({ rpc, from }) }))
import ManagersList from './ManagersList'

afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())

const row = (over = {}) => ({ id: 'm1', name: 'Kasuni', artistCount: 2, open: 2, top: 'no_reply' as const, nudgeLines: ['Reply to Hilton (2 days)', 'Chase 45,000 LKR before 3 Nov for Kaos Night'], ...over })
const renderList = (rows = [row()]) => render(<ManagersList rows={rows} selectedId={null} onSelect={() => undefined} />)

describe('Nudge on the Managers panel', () => {
  it('opens WhatsApp in a new tab with the message pre-written', async () => {
    rpc.mockResolvedValue({ data: [{ manager_id: 'm1', whatsapp: '+94 77 123 4567' }], error: null })
    renderList()
    const link = (await screen.findByRole('link', { name: /Nudge Kasuni/ })) as HTMLAnchorElement
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    const url = new URL(link.href)
    expect(url.origin + url.pathname).toBe('https://wa.me/94771234567')
    expect(url.searchParams.get('text')).toBe(
      'Hi Kasuni, 2 things need you: Reply to Hilton (2 days); Chase 45,000 LKR before 3 Nov for Kaos Night. Can you pick these up today?',
    )
    expect(screen.queryByText('Add WhatsApp number')).toBeNull()
  })

  it('is disabled with "Nothing to nudge" when nothing is open', async () => {
    rpc.mockResolvedValue({ data: [{ manager_id: 'm1', whatsapp: '0771234567' }], error: null })
    renderList([row({ open: 0, top: null, nudgeLines: [] })])
    const btn = await screen.findByRole('button', { name: 'Nothing to nudge' })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('shows no Nudge control at all when the rows carry no nudge lines (not the owner)', () => {
    rpc.mockResolvedValue({ data: [], error: null })
    renderList([row({ nudgeLines: undefined })])
    expect(screen.queryByText(/Nudge|Add WhatsApp/)).toBeNull()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('with no number, hides Nudge and offers Add WhatsApp number; saves a tidied number', async () => {
    rpc.mockImplementation(async (fn: string) => (fn === 'manager_whatsapps' ? { data: [], error: null } : { data: null, error: null }))
    renderList()
    fireEvent.click(await screen.findByRole('button', { name: /Add WhatsApp number for Kasuni/ }))
    fireEvent.change(screen.getByLabelText(/Kasuni's WhatsApp number/), { target: { value: '+94 (77) 123-4567' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save number' }))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('set_manager_whatsapp', { p_manager: 'm1', p_whatsapp: '+94771234567' }))
    expect(await screen.findByRole('link', { name: /Nudge Kasuni/ })).toBeTruthy()
  })

  it('refuses a bad number in plain English without calling the database', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    renderList()
    fireEvent.click(await screen.findByRole('button', { name: /Add WhatsApp number/ }))
    fireEvent.change(screen.getByLabelText(/WhatsApp number$/), { target: { value: '12ab' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save number' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/7 to 15 digits/)
    expect(rpc).toHaveBeenCalledTimes(1) // only the initial manager_whatsapps read
  })

  it('shows a plain-English error when the save fails', async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === 'manager_whatsapps' ? { data: [], error: null } : { data: null, error: { code: '42501', message: 'permission denied' } },
    )
    renderList()
    fireEvent.click(await screen.findByRole('button', { name: /Add WhatsApp number/ }))
    fireEvent.change(screen.getByLabelText(/WhatsApp number$/), { target: { value: '0771234567' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save number' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/only the owner/i)
  })

  it('treats a permission error on load as no numbers', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied for function manager_whatsapps' } })
    renderList()
    expect(await screen.findByRole('button', { name: /Add WhatsApp number/ })).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
