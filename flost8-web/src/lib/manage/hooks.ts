import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from './supabase'
import { friendlyError } from './api'

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string }

/**
 * Runs `load` on mount and whenever it changes (pass a useCallback'd function).
 * `refresh` re-fetches quietly (old data stays on screen); `retry` goes back to the loading state.
 */
export function useLoad<T>(load: () => Promise<T>): { state: LoadState<T>; refresh: () => void; retry: () => void } {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    load().then(
      (data) => alive && setState({ status: 'ok', data }),
      (err) => alive && setState({ status: 'error', message: friendlyError(err) }),
    )
    return () => {
      alive = false
    }
  }, [load, nonce])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setNonce((n) => n + 1)
  }, [])
  return { state, refresh, retry }
}

export type SessionState = { loading: true } | { loading: false; session: Session | null }

/** Supabase session, persisted in localStorage by supabase-js itself. */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ loading: true })
  useEffect(() => {
    const sb = getSupabase()
    sb.auth.getSession().then(({ data }) => setState({ loading: false, session: data.session }))
    // No awaits inside this callback: supabase-js holds a lock while it runs.
    const { data } = sb.auth.onAuthStateChange((_event, session) => setState({ loading: false, session }))
    return () => data.subscription.unsubscribe()
  }, [])
  return state
}

export function signInWithGoogle(): Promise<unknown> {
  return getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/manage`, queryParams: { prompt: 'select_account' } },
  })
}

export function signOut(): Promise<unknown> {
  return getSupabase().auth.signOut()
}
