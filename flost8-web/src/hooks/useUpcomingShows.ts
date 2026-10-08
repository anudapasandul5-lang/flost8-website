import { useEffect, useState } from 'react'
import { BOOKING_API_URL } from '../lib/config'
import { normalizeUpcomingShows, PLACEHOLDER_SHOWS, type UpcomingShow } from '../lib/bookingContract'

// PLACEHOLDER_SHOWS are invented dates. They are only ever shown when the app has no API
// configured at all (a bare local checkout) — NEVER as a fallback for a live but empty
// response, which would advertise gigs that do not exist on the real client site.
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
      .then((response) => {
        // §6: a 5xx still returns JSON ({ok:false,...}); without this an outage
        // would silently fall back to placeholder shows with error:false.
        if (!response.ok) throw new Error(`upcoming shows HTTP ${response.status}`)
        return response.json()
      })
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
