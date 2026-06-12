import { render, screen } from '@testing-library/react'
import { StatCard } from './StatCard'

class MockIntersectionObserver {
  observe = () => {}
  unobserve = () => {}
  disconnect = () => {}
  takeRecords = () => []
}

describe('StatCard', () => {
  it('shows the final value immediately when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

    try {
      render(<StatCard value="200k" label="x" index={0} />)
      expect(screen.getByText('200k')).toBeTruthy()
      expect(screen.queryByText('0')).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
