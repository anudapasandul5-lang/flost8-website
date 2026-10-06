import { useCallback, useEffect, useState } from 'react'
import { parseAuthError } from '../../lib/manage/access'
import { fetchManager } from '../../lib/manage/api'
import { signInWithGoogle, signOut, useLoad, useSession } from '../../lib/manage/hooks'
import type { Manager } from '../../lib/manage/types'
import { AccessDenied, LoadingScreen, SignInScreen } from './Gate'
import Workspace from './Workspace'
import { ErrorPanel } from './ui'

/** Keeps the page out of search results while it is open (robots.txt has no /manage line to rely on). */
function useNoIndex() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'FLOST8 Bookings'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
      document.title = prevTitle
    }
  }, [])
}

function SignedIn({ userId }: { userId: string }) {
  const load = useCallback(() => fetchManager(userId), [userId])
  const { state, retry } = useLoad<Manager | null>(load)

  if (state.status === 'loading') return <LoadingScreen />
  if (state.status === 'error')
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-base px-6">
        <div className="w-full max-w-sm">
          <ErrorPanel message={state.message} onRetry={retry} />
          <button type="button" className="mt-6 w-full text-center font-grotesk text-sm text-[var(--ink-50)] underline" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </main>
    )
  if (!state.data) return <AccessDenied mode="signed-in" />
  return <Workspace me={state.data} />
}

export default function ManagePage() {
  useNoIndex()
  // Read before supabase-js touches the URL. Cleared from the address bar so a refresh is clean.
  const [authError, setAuthError] = useState<string | null>(() => parseAuthError(window.location.search, window.location.hash))
  const session = useSession()

  useEffect(() => {
    if (!authError) return
    console.warn('Sign-in was rejected:', authError)
    window.history.replaceState(null, '', window.location.pathname)
  }, [authError])

  if (session.loading) return <LoadingScreen />
  if (session.session) return <SignedIn userId={session.session.user.id} />
  if (authError)
    return (
      <AccessDenied
        mode="rejected"
        onTryAnother={() => {
          setAuthError(null)
          void signInWithGoogle()
        }}
      />
    )
  return <SignInScreen />
}
