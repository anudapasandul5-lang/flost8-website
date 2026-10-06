import { useState, type ReactNode } from 'react'
import { GoogleLogo, SignOut } from '@phosphor-icons/react'
import { signInWithGoogle, signOut } from '../../lib/manage/hooks'
import { BTN_GHOST, BTN_PRIMARY } from './styles'

function Shell({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-[100dvh] items-center justify-center bg-base px-6 py-10 outline-none"
    >
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}

export function LoadingScreen() {
  return (
    <Shell>
      <p role="status" className="text-center font-grotesk text-[var(--ink-50)]">
        Loading...
      </p>
    </Shell>
  )
}

export function SignInScreen() {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function go() {
    setBusy(true)
    setFailed(false)
    try {
      await signInWithGoogle()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-5xl text-ink">FLOST8 BOOKINGS</h1>
      <p className="mb-8 mt-3 font-grotesk text-[1rem] leading-relaxed text-[var(--ink-72)]">
        Sign in with your Google account to see your inquiries and bookings.
      </p>
      <button type="button" onClick={go} disabled={busy} className={`${BTN_PRIMARY} w-full`}>
        <GoogleLogo size={22} weight="bold" aria-hidden="true" />
        {busy ? 'Opening Google...' : 'Continue with Google'}
      </button>
      {failed && (
        <p role="alert" className="mt-3 font-grotesk text-sm text-[var(--error)]">
          Could not start sign-in. Please try again.
        </p>
      )}
    </Shell>
  )
}

/** Calm "not on the list" screen. `onRetry` starts a fresh Google sign-in (after a rejected email). */
export function AccessDenied({ mode, onTryAnother }: { mode: 'rejected' | 'signed-in'; onTryAnother?: () => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <Shell>
      <h1 className="font-display text-5xl text-ink">NO ACCESS YET</h1>
      <p className="mb-8 mt-3 font-grotesk text-[1.0625rem] leading-relaxed text-[var(--ink-72)]">
        That Google account isn&apos;t on the access list. Ask Anuda to add your email.
      </p>
      {mode === 'rejected' ? (
        <button
          type="button"
          className={`${BTN_PRIMARY} w-full`}
          disabled={busy}
          onClick={() => {
            setBusy(true)
            onTryAnother?.()
          }}
        >
          Try another account
        </button>
      ) : (
        <button type="button" className={`${BTN_GHOST} w-full`} onClick={() => void signOut()}>
          <SignOut size={18} aria-hidden="true" />
          Sign out
        </button>
      )}
    </Shell>
  )
}
