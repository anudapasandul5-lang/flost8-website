import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Contact, ContactStats, Reminder } from '../../lib/manage/contacts'
import { KASUNI, makeInquiry, OWNER } from '../../lib/manage/testFixtures'
import ContactPicker from './ContactPicker'
import ContactsView from './ContactsView'
import FollowUpsPanel from './FollowUpsPanel'
import Shell from './Shell'
import TodayView from './TodayView'

vi.mock('../../lib/manage/contactsApi', () => ({ setReminderDone: vi.fn().mockResolvedValue(undefined) }))
import { setReminderDone } from '../../lib/manage/contactsApi'

afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())

const TODAY = '2026-10-07'
const contact = (over: Partial<Contact> = {}): Contact => ({
  id: 'c1', name: 'Ruwan Perera', types: ['client'], phones: ['077 123 4567'], whatsapp: null, emails: [], organisation: 'Cloud Nine', city: 'Colombo',
  instagram: null, language: null, owner_id: KASUNI.id, notes: null, created_by: null, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
  deleted_at: null, deleted_by: null, merged_into: null, ...over,
})
const noStats: ReadonlyMap<string, ContactStats> = new Map()

describe('Shell tabs by role', () => {
  it('a salesperson lands on Today and sees Contacts, not Overview', () => {
    render(<Shell me={KASUNI} team={[]} needCount={2} followUpCount={1} totalCount={5}>{({ view }) => <p>view:{view}</p>}</Shell>)
    expect(screen.getByText('view:today')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Contacts$/ }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /^Overview$/ })).toBeNull()
    // Today's badge counts what needs her plus the follow-ups due
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
  })
  it('the owner keeps Overview and Team follow-ups and gains Contacts', () => {
    render(<Shell me={OWNER} team={[]} needCount={0} totalCount={0}>{({ view }) => <p>view:{view}</p>}</Shell>)
    expect(screen.getByText('view:overview')).toBeTruthy()
    for (const name of [/^Overview$/, /^Team follow-ups/, /^Contacts$/]) expect(screen.getAllByRole('button', { name }).length).toBeGreaterThan(0)
  })
})

describe('ContactPicker', () => {
  const list = [contact(), contact({ id: 'c2', name: 'Nimali', phones: [], organisation: null }), contact({ id: 'c3', name: 'Gone', deleted_at: '2026-10-01T00:00:00Z' })]
  const setup = (over: Partial<Parameters<typeof ContactPicker>[0]> = {}) => {
    const props = { id: 'org', contacts: list, picked: null, text: '', onText: vi.fn(), onPick: vi.fn(), onClear: vi.fn(), onCreate: vi.fn(), ...over }
    render(<ContactPicker {...props} />)
    return props
  }
  it('offers matching contacts and an add-as-new row, never deleted ones', () => {
    setup({ text: 'ruw' })
    fireEvent.focus(screen.getByRole('combobox'))
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options[0]).toContain('Ruwan Perera')
    expect(options.at(-1)).toContain('Add “ruw” as a new contact')
    expect(options.join()).not.toContain('Gone')
  })
  it('Enter alone does not pick or create; Enter after an arrow key does', () => {
    const p = setup({ text: 'ruw' })
    const box = screen.getByRole('combobox')
    fireEvent.focus(box)
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(p.onPick).not.toHaveBeenCalled()
    expect(p.onCreate).not.toHaveBeenCalled()
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: 'ArrowUp' })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(p.onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }))
  })
  it('picking a contact hands it back', () => {
    const p = setup({ text: 'ruw' })
    fireEvent.focus(screen.getByRole('combobox'))
    fireEvent.mouseDown(screen.getAllByRole('option')[0])
    expect(p.onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }))
  })
  it('does not offer to add a name that is already saved', () => {
    setup({ text: 'Ruwan Perera' })
    fireEvent.focus(screen.getByRole('combobox'))
    expect(screen.getAllByRole('option').map((o) => o.textContent).join()).not.toContain('as a new contact')
  })
  it('creating from the typed name saves it and picks it', async () => {
    const made = contact({ id: 'new', name: 'Brand New' })
    const p = setup({ text: 'Brand New', onCreate: vi.fn().mockResolvedValue(made) })
    fireEvent.focus(screen.getByRole('combobox'))
    fireEvent.mouseDown(screen.getAllByRole('option').at(-1)!)
    await waitFor(() => expect(p.onPick).toHaveBeenCalledWith(made))
    expect(p.onCreate).toHaveBeenCalledWith('Brand New')
  })
  it('a picked contact shows as a chip and can be cleared', () => {
    const p = setup({ picked: list[0] })
    expect(screen.getByText('Ruwan Perera')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Pick a different organizer' }))
    expect(p.onClear).toHaveBeenCalled()
  })
})

describe('ContactsView', () => {
  const baseProps = {
    me: KASUNI, managers: [KASUNI, OWNER], stats: noStats, managerFilter: null, today: TODAY,
    onOpen: vi.fn(), onNew: vi.fn(), onMerge: vi.fn(), onTemplates: vi.fn(), onWhatsApp: vi.fn(), onRestore: vi.fn(),
  }
  it('searches by phone in any spelling and filters by type', () => {
    const contacts = [contact(), contact({ id: 'c2', name: 'Club Nine', types: ['venue'], phones: ['091 223 4455'] })]
    render(<ContactsView {...baseProps} contacts={contacts} />)
    expect(screen.getByText('2 of 2 contacts')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Search contacts'), { target: { value: '+94 77 123' } })
    expect(screen.getByText('1 of 2 contacts')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Search contacts'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Venue' }))
    expect(screen.getByText('1 of 2 contacts')).toBeTruthy()
    expect(screen.getByText('Club Nine')).toBeTruthy()
  })
  it('disables WhatsApp when there is no usable number', () => {
    render(<ContactsView {...baseProps} contacts={[contact({ phones: [] })]} />)
    expect((screen.getByRole('button', { name: 'WhatsApp Ruwan Perera' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('Trash lists every deleted contact however old, except merged-away ones, and restores them', () => {
    const onRestore = vi.fn()
    const contacts = [contact({ id: 'a', name: 'Fresh', deleted_at: '2026-10-01T00:00:00Z' }), contact({ id: 'b', name: 'Stale', deleted_at: '2026-08-01T00:00:00Z' }), contact({ id: 'm', name: 'Merged away', deleted_at: '2026-10-02T00:00:00Z', merged_into: 'c1' })]
    render(<ContactsView {...baseProps} contacts={contacts} onRestore={onRestore} />)
    fireEvent.click(screen.getByRole('button', { name: /^Trash/ }))
    expect(screen.getByText('Fresh')).toBeTruthy()
    expect(screen.getByText('Stale')).toBeTruthy()
    expect(screen.queryByText('Merged away')).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: 'Restore' })[0])
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })
  it('the owner can erase a trashed contact for good, after a confirm; a manager never sees the button', () => {
    const onErase = vi.fn()
    const contacts = [contact({ id: 'a', name: 'Fresh', deleted_at: '2026-10-01T00:00:00Z' })]
    const { unmount } = render(<ContactsView {...baseProps} me={OWNER} contacts={contacts} onErase={onErase} />)
    fireEvent.click(screen.getByRole('button', { name: /^Trash/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    expect(onErase).not.toHaveBeenCalled()
    expect(screen.getByText(/cannot be undone/i)).toBeTruthy()
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete forever' }))
    expect(onErase).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
    unmount()
    render(<ContactsView {...baseProps} me={KASUNI} contacts={contacts} onErase={onErase} />)
    fireEvent.click(screen.getByRole('button', { name: /^Trash/ }))
    expect(screen.queryByRole('button', { name: 'Delete forever' })).toBeNull()
  })
  it('an empty book explains how it fills up', () => {
    render(<ContactsView {...baseProps} contacts={[]} />)
    expect(screen.getByText(/No contacts yet/)).toBeTruthy()
  })
})

describe('FollowUpsPanel', () => {
  const rem = (id: string, day: string, manager = KASUNI.id, done = false): Reminder => ({ id, inquiry_id: null, contact_id: 'c1', manager_id: manager, due_at: `${day}T12:00:00Z`, note: `note ${id}`, done, done_at: null, created_at: '2026-10-01T00:00:00Z' })
  const props = { contacts: [contact()], managers: [KASUNI, OWNER], today: TODAY, onOpenContact: vi.fn(), onWhatsApp: vi.fn(), onChanged: vi.fn(), notify: vi.fn() }
  it('shows only what is overdue or due today, soonest first, and says nothing on a quiet day', () => {
    const { container, rerender } = render(<FollowUpsPanel {...props} me={KASUNI} reminders={[rem('later', '2026-10-09'), rem('today', '2026-10-07'), rem('late', '2026-10-05')]} />)
    const items = within(screen.getByRole('list')).getAllByRole('listitem').map((li) => li.textContent)
    expect(items).toHaveLength(2)
    expect(items[0]).toContain('note late')
    expect(items[1]).toContain('note today')
    rerender(<FollowUpsPanel {...props} me={KASUNI} reminders={[rem('later', '2026-10-09')]} />)
    expect(container.firstChild).toBeNull()
  })
  it("the owner is told whose reminder it is", () => {
    render(<FollowUpsPanel {...props} me={OWNER} reminders={[rem('x', '2026-10-05', KASUNI.id)]} />)
    expect(screen.getByText(/for Kasuni/)).toBeTruthy()
  })
  it('Done marks it done and reloads', async () => {
    render(<FollowUpsPanel {...props} me={KASUNI} reminders={[rem('x', '2026-10-05')]} />)
    fireEvent.click(screen.getByRole('button', { name: /Done/ }))
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled())
    expect(setReminderDone).toHaveBeenCalledWith('x', true)
  })
})

describe('TodayView', () => {
  const base = { me: KASUNI, today: TODAY, followUps: null, followUpCount: 0, needs: null, needCount: 0, payments: [], quiet: [], stats: noStats, onOpenInquiry: vi.fn(), onOpenContact: vi.fn(), onWhatsApp: vi.fn() }
  it('says all clear when nothing is due', () => {
    render(<TodayView {...base} />)
    expect(screen.getByText(/All clear, Kasuni/)).toBeTruthy()
  })
  it('hides the all-clear and lists the quiet contacts when there are some', () => {
    render(<TodayView {...base} quiet={[contact({ name: 'Hotel Lakeside' })]} />)
    expect(screen.queryByText(/All clear/)).toBeNull()
    expect(screen.getByText('Hotel Lakeside')).toBeTruthy()
  })
  it('Payments pending offers Mark paid only where the viewer may change the money', () => {
    const inq = makeInquiry({ id: 'p1', event_name: 'Atmosphere', status: 'booking_confirmed', event_date: '2026-10-20', money: { currency: 'LKR', fee: 150000, advance: 0, balance: 150000, balance_note: null, total: null, booking_fee: null } })
    const payments = [{ inquiry: inq, amount: 150000, currency: 'LKR' as const, overdue: false }]
    const onMarkPaid = vi.fn()
    const { unmount } = render(<TodayView {...base} payments={payments} canMarkPaid={() => true} onMarkPaid={onMarkPaid} />)
    fireEvent.click(screen.getByRole('button', { name: /Mark Atmosphere paid/ }))
    expect(onMarkPaid).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }))
    unmount()
    render(<TodayView {...base} payments={payments} canMarkPaid={() => false} onMarkPaid={onMarkPaid} />)
    expect(screen.queryByRole('button', { name: /Mark Atmosphere paid/ })).toBeNull()
  })
})
