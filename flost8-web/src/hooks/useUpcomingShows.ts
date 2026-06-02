import { useEffect, useState } from 'react'
import { BOOKING_API_URL } from '../lib/config'
import { normalizeUpcomingShows, PLACEHOLDER_SHOWS, type UpcomingShow } from '../lib/bookingContract'

interface UpcomingShowsState {
  shows: UpcomingShow[]
  loading: boolean
  error: boolean
}

export function useUpcomingShows(limit?: number): UpcomingShowsState {
  const [state, setState] = useState<UpcomingShowsState>(() =>
    BOOKING_API_URL
      ? { shows: [], loading: true, error: false }
      : {
          shows: typeof limit === 'number' ? PLACEHOLDER_SHOWS.slice(0, limit) : PLACEHOLDER_SHOWS,
          loading: false,
          error: false,
        }
  )

  useEffect(() => {
    if (!BOOKING_API_URL) {
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams({ action: 'upcoming' })
    if (typeof limit === 'number') params.set('n', String(limit))

    fetch(`${BOOKING_API_URL}?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        setState({
          shows: normalizeUpcomingShows(data, limit),
          loading: false,
          error: false,
        })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState({ shows: [], loading: false, error: true })
      })

    return () => controller.abort()
  }, [limit])

  return state
}
