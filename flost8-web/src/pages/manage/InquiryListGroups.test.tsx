import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { KASUNI, makeInquiry } from '../../lib/manage/testFixtures'
import InquiryList from './InquiryList'

afterEach(cleanup)

const TODAY = '2026-10-08'
const noop = vi.fn()
const mount = (items: ReturnType<typeof makeInquiry>[]) =>
  render(
    <InquiryList items={items} artists={[]} me={KASUNI} managers={[KASUNI]} conflicts={new Set()} today={TODAY} onOpen={noop} onClear={noop} onDuplicate={noop} onSetStatus={noop} onSnooze={noop} onBulkStatus={noop} />,
  )

const joint = (id: string, artist: string) =>
  makeInquiry({ id, event_name: 'Lunarverse', event_date: '2026-11-19', venue: 'Southern Coast', city: null, artists: [artist], owner_id: KASUNI.id })

it('a joint show is one card (title once) with a line and a checkbox per artist, and the month counts shows not rows', () => {
  mount([joint('a', 'anush'), joint('b', 'the-professor')])
  expect(screen.getAllByText('Lunarverse')).toHaveLength(1)
  expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  expect(document.querySelectorAll('[data-row-id]')).toHaveLength(2)
  expect(screen.getByRole('button', { name: /NOV 2026/ }).textContent).toContain('1 show')
})

it('past months after the first start folded and open on click; the header says how many shows are inside', () => {
  const upcoming = makeInquiry({ id: 'u', event_name: 'Next', event_date: '2026-10-20', owner_id: KASUNI.id })
  const recent = makeInquiry({ id: 'p1', event_name: 'Recent', event_date: '2026-09-19', owner_id: KASUNI.id })
  const old = makeInquiry({ id: 'p2', event_name: 'Old Gig', event_date: '2026-03-01', owner_id: KASUNI.id })
  mount([upcoming, recent, old])
  expect(screen.getByText('Next')).toBeTruthy()
  expect(screen.queryByText('Recent')).toBeNull()
  expect(screen.queryByText('Old Gig')).toBeNull()
  const header = screen.getByRole('button', { name: /MAR 2026/ })
  expect(header.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(header)
  expect(screen.getByText('Old Gig')).toBeTruthy()
  expect(header.getAttribute('aria-expanded')).toBe('true')
})

it('when everything is in the past the newest month is open so the page is never a wall of closed bars', () => {
  mount([makeInquiry({ id: 'p1', event_name: 'Recent', event_date: '2026-09-19' }), makeInquiry({ id: 'p2', event_name: 'Old Gig', event_date: '2026-03-01' })])
  expect(screen.getByText('Recent')).toBeTruthy()
  expect(screen.queryByText('Old Gig')).toBeNull()
})
