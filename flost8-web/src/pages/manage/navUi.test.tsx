import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { formatDate } from '../../lib/manage/calendar'
import { todayISO } from '../../lib/manage/filters'
import { OWNER } from '../../lib/manage/testFixtures'
import CalendarView from './CalendarView'
import Shell from './Shell'

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('calendar: an empty day offers Add event on that day, from the cell and from the list under the grid', () => {
  const add = vi.fn()
  const today = todayISO()
  render(<CalendarView items={[]} artists={[]} conflicts={new Set()} onOpen={vi.fn()} onAddOnDate={add} />)
  const name = `Add event on ${formatDate(today)}`
  fireEvent.click(screen.getByRole('button', { name }))
  expect(add).toHaveBeenLastCalledWith(today)
  fireEvent.click(screen.getByRole('button', { name: formatDate(today) }))
  const both = screen.getAllByRole('button', { name })
  expect(both).toHaveLength(2)
  fireEvent.click(both[1])
  expect(add).toHaveBeenCalledTimes(2)
})

it('calendar: no Add buttons for someone who cannot add events', () => {
  render(<CalendarView items={[]} artists={[]} conflicts={new Set()} onOpen={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: formatDate(todayISO()) }))
  expect(screen.queryByRole('button', { name: /Add event on/ })).toBeNull()
})

it('shell: remembers the open view across a reload', () => {
  const first = render(<Shell me={OWNER} team={[]} needCount={0} totalCount={0}>{() => <p>x</p>}</Shell>)
  fireEvent.click(screen.getAllByRole('button', { name: /All inquiries/ })[0])
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('All inquiries')
  first.unmount()
  render(<Shell me={OWNER} team={[]} needCount={0} totalCount={0}>{() => <p>x</p>}</Shell>)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('All inquiries')
})

it('shell: still works when storage is blocked or holds junk', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota')
  })
  render(<Shell me={OWNER} team={[]} needCount={0} totalCount={0}>{() => <p>x</p>}</Shell>)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Overview')
  fireEvent.click(screen.getAllByRole('button', { name: /Calendar/ })[0])
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Calendar')
  cleanup()
  vi.restoreAllMocks()
  window.localStorage.setItem(`flost8.manage.view.${OWNER.id}`, '{"not":"a view"')
  render(<Shell me={OWNER} team={[]} needCount={0} totalCount={0}>{() => <p>x</p>}</Shell>)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Overview')
})
