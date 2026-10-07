import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useToday } from './hooks'
import { snoozeChoices } from './snooze'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function Probe() {
  const today = useToday()
  return <p data-testid="t">{today} {snoozeChoices(today)[0].date}</p>
}

it('rolls over at midnight while the tab stays open, so Snooze "Tomorrow" is really tomorrow', () => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date(2026, 9, 7, 23, 58)) // Wed 7 Oct, 23:58 device time
  render(<Probe />)
  expect(screen.getByTestId('t').textContent).toBe('2026-10-07 2026-10-08')
  act(() => {
    vi.setSystemTime(new Date(2026, 9, 8, 0, 1))
    vi.advanceTimersByTime(60_000)
  })
  expect(screen.getByTestId('t').textContent).toBe('2026-10-08 2026-10-09')
})

it('catches up as soon as a backgrounded tab is shown again', () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 7, 22, 0))
  render(<Probe />)
  act(() => {
    vi.setSystemTime(new Date(2026, 9, 9, 8, 0))
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(screen.getByTestId('t').textContent).toBe('2026-10-09 2026-10-10')
})
