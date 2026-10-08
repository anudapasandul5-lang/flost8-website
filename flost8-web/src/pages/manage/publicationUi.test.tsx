import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Toast } from './ui'
import Shell from './Shell'
import { KASUNI, OWNER } from '../../lib/manage/testFixtures'

afterEach(() => { cleanup(); vi.useRealTimers() })
it('keeps a failed website-update toast available until Retry or dismissal', () => {
  vi.useFakeTimers()
  const retry = vi.fn()
  const dismiss = vi.fn()
  render(<Toast toast={{ kind: 'error', text: 'Saved, but the website list was not updated', retry }} onDone={dismiss} />)
  act(() => vi.advanceTimersByTime(10000))
  expect(dismiss).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(retry).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
  expect(dismiss).toHaveBeenCalledOnce()
})
it('only offers website resync to the owner and disables it while running', () => {
  const resync = vi.fn()
  const { rerender } = render(<Shell me={KASUNI} team={[]} needCount={0} totalCount={0} onResync={resync}>{() => <p>Events</p>}</Shell>)
  expect(screen.queryByRole('button', { name: 'Resync website' })).toBeNull()
  rerender(<Shell me={OWNER} team={[]} needCount={0} totalCount={0} onResync={resync}>{() => <p>Events</p>}</Shell>)
  fireEvent.click(screen.getByRole('button', { name: 'Resync website' }))
  expect(resync).toHaveBeenCalledOnce()
  rerender(<Shell me={OWNER} team={[]} needCount={0} totalCount={0} onResync={resync} resyncBusy>{() => <p>Events</p>}</Shell>)
  expect(screen.getByRole('button', { name: 'Updating website…' }).hasAttribute('disabled')).toBe(true)
})
