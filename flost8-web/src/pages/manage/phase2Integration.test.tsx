import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { focusableRows, overlayIsOpen, shortcutFor } from '../../lib/manage/navState'
import { KASUNI, makeInquiry, OWNER } from '../../lib/manage/testFixtures'
import apiSrc from '../../lib/manage/api.ts?raw'
import nudgeSrc from '../../lib/manage/nudgeApi.ts?raw'
import InquiryList from './InquiryList'
import NeedsList from './NeedsList'
import RowMenu from './RowMenu'

afterEach(cleanup)

const migrations = import.meta.glob<string>('../../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true })
const sql012 = () => Object.entries(migrations).find(([f]) => f.endsWith('20261007_012_snooze_and_manager_whatsapp.sql'))![1]

it('contract: nudgeApi rpc names, arguments and columns match migration 012', () => {
  const api = nudgeSrc
  const sql = sql012()
  expect(api).toContain("rpc('manager_whatsapps')")
  expect(sql).toMatch(/function public\.manager_whatsapps\(\) returns table \(manager_id uuid, whatsapp text\)/)
  expect(api).toContain("rpc('set_manager_whatsapp', { p_manager: managerId, p_whatsapp: whatsapp })")
  expect(sql).toMatch(/function public\.set_manager_whatsapp\(p_manager uuid, p_whatsapp text\) returns void/)
  expect(api).toContain('manager_id: string; whatsapp: string')
})

it('contract: migration 012 follows 011 with no gap or clash, and anon cannot run the new functions', () => {
  const nums = Object.keys(migrations).sort().map((f) => Number(/\/\d+_(\d+)_[^/]*$/.exec(f)?.[1]))
  expect(nums).toEqual(Array.from({ length: nums.length }, (_, n) => n + 1))
  expect(nums.at(-1)).toBe(12)
  expect(sql012()).toMatch(/revoke execute on function public\.manager_whatsapps\(\), public\.set_manager_whatsapp\(uuid, text\) from public, anon/)
})

it('contract: the managers table is never read with select * (the whatsapp column is hidden from table reads)', () => {
  const api = apiSrc
  expect(api).not.toMatch(/from\('managers'\)\s*\.select\('\*'\)/)
  expect(api).toContain("select('id,name,email,role,user_id')")
})

it('shortcut guard is suppressed while a row menu (and its status/snooze choices) is open', () => {
  render(
    <div>
      <RowMenu
        items={[
          { label: 'Snooze', group: [{ label: 'Tomorrow', onClick: vi.fn() }, { label: 'Pick a date', date: { min: '2026-10-08', onPick: vi.fn() } }] },
          { label: 'Duplicate', onClick: vi.fn() },
        ]}
      />
    </div>,
  )
  const press = (key: string, target: Element) => shortcutFor({ key, ctrlKey: false, metaKey: false, altKey: false, target }, overlayIsOpen(document))
  expect(press('n', document.body)).toBe('add')
  fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
  expect(overlayIsOpen(document)).toBe(true)
  expect(press('n', document.body)).toBeNull()
  expect(press('/', document.body)).toBeNull()
  expect(press('ArrowDown', document.body)).toBeNull()
  fireEvent.click(screen.getByRole('menuitem', { name: /Snooze/ }))
  expect(press('n', screen.getByRole('menuitem', { name: 'Tomorrow' }))).toBeNull()
  expect(press('n', screen.getByLabelText('Pick a date'))).toBeNull()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(overlayIsOpen(document)).toBe(false)
})

const noop = vi.fn()
const sheetRow = makeInquiry({ id: 'sheet1', source: 'sheet_import', owner_id: KASUNI.id, status: 'new' })
const webRow = makeInquiry({ id: 'web1', source: 'website', owner_id: KASUNI.id, status: 'new' })
const appRow = makeInquiry({ id: 'app1', source: 'manual', owner_id: KASUNI.id, status: 'quoted' })

it('All list: one focusable element per row so arrow keys work, and sheet rows cannot be selected or status-edited', () => {
  const { container } = render(
    <InquiryList items={[sheetRow, webRow, appRow]} artists={[]} me={KASUNI} managers={[KASUNI]} conflicts={new Set()} onOpen={noop} onClear={noop} onDuplicate={noop} onSetStatus={noop} onSnooze={noop} onBulkStatus={noop} />,
  )
  expect(focusableRows(container).map((e) => e.dataset.rowId)).toEqual(['sheet1', 'web1', 'app1'])
  expect(container.querySelectorAll('[data-row-id]')).toHaveLength(3)
  expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2) // web + app rows, not the sheet row
  // Row menus: Set status only on non-sheet rows.
  const menus = screen.getAllByRole('button', { name: 'More actions' })
  fireEvent.click(menus[0])
  expect(screen.queryByRole('menuitem', { name: /Set status/ })).toBeNull()
  expect(screen.getByRole('menuitem', { name: /Snooze/ })).toBeTruthy()
  fireEvent.click(menus[1])
  expect(screen.getByRole('menuitem', { name: /Set status/ })).toBeTruthy()
})

it('All list: bulk bar only acts on ticked, status-editable rows', () => {
  const bulk = vi.fn()
  render(<InquiryList items={[sheetRow, webRow]} artists={[]} me={KASUNI} managers={[KASUNI]} conflicts={new Set()} onOpen={noop} onClear={noop} onDuplicate={noop} onSetStatus={noop} onSnooze={noop} onBulkStatus={bulk} />)
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Mark spam' }))
  expect(bulk).toHaveBeenCalledWith(['web1'], 'spam')
})

it('Needs you / Team follow-ups: rows are focusable once each and Enter opens the focused row', () => {
  const open = vi.fn()
  const old = new Date(Date.now() - 3 * 86_400_000).toISOString()
  const row = makeInquiry({ id: 'n1', status: 'new', owner_id: KASUNI.id, updated_at: old })
  const ctx = { today: '2026-10-07', now: new Date(), lastTouch: new Map(), conflicts: new Set<string>(), meId: OWNER.id, isOwner: true }
  const { container } = render(
    <NeedsList rows={[{ inquiry: row, reasons: ['no_reply'] }]} all={[row]} artists={[]} managers={[KASUNI, OWNER]} me={OWNER} ctx={ctx} nextShow={undefined} onOpen={open} onChased={noop} onAdvance={noop} />,
  )
  const rows = focusableRows(container)
  expect(rows.map((e) => e.dataset.rowId)).toEqual(['n1'])
  rows[0].focus()
  expect(document.activeElement).toBe(rows[0])
  // fireEvent returns false when the event was default-prevented: the Enter must not also press the button the drawer focuses.
  expect(fireEvent.keyDown(rows[0], { key: 'Enter' })).toBe(false)
  expect(open).toHaveBeenCalledWith('n1')
  // Enter on a button inside the card must not also open the row.
  open.mockClear()
  fireEvent.keyDown(screen.getByRole('button', { name: 'More actions' }), { key: 'Enter' })
  expect(open).not.toHaveBeenCalled()
})

it('row menu: arrow keys walk the items, Escape closes and puts focus back on the button', () => {
  render(<RowMenu items={[{ label: 'One', onClick: vi.fn() }, { label: 'Two', onClick: vi.fn() }, { label: 'Three', onClick: vi.fn() }]} />)
  const trigger = screen.getByRole('button', { name: 'More actions' })
  fireEvent.click(trigger)
  const menu = screen.getByRole('menu')
  const [one, two, three] = screen.getAllByRole('menuitem')
  one.focus()
  fireEvent.keyDown(menu, { key: 'ArrowDown' })
  expect(document.activeElement).toBe(two)
  fireEvent.keyDown(menu, { key: 'End' })
  expect(document.activeElement).toBe(three)
  fireEvent.keyDown(menu, { key: 'ArrowDown' })
  expect(document.activeElement).toBe(one)
  fireEvent.keyDown(menu, { key: 'ArrowUp' })
  expect(document.activeElement).toBe(three)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('menu')).toBeNull()
  expect(document.activeElement).toBe(trigger)
})
