import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PencilSimple, Trash, Plus, SignOut } from '@phosphor-icons/react'
import { PUBLIC_ARTISTS } from '../lib/artistRoster'
import {
  addShow,
  AdminAuthError,
  deleteShow,
  EMPTY_SHOW,
  listShows,
  prettyDate,
  sortShows,
  to12h,
  to24h,
  updateShow,
  validateShow,
  type AdminShow,
} from '../lib/showsAdmin'

const PW_KEY = 'flost8_admin_pw'

const INPUT_CLS =
  'w-full bg-raise border border-[var(--bg-line)] text-ink font-grotesk text-[16px] md:text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-line)] transition-colors placeholder:text-[var(--ink-32)]'

export default function AdminPage() {
  const [password, setPassword] = useState<string>(() => sessionStorage.getItem(PW_KEY) ?? '')
  const [authed, setAuthed] = useState(false)

  const [pwInput, setPwInput] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  const [shows, setShows] = useState<AdminShow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editing, setEditing] = useState<AdminShow | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Keep this page out of search indexes.
  useEffect(() => {
    document.title = 'FLOST8 · Shows Admin'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(PW_KEY)
    setPassword('')
    setAuthed(false)
    setShows([])
    setEditing(null)
    setPwInput('')
  }, [])

  const refresh = useCallback(async () => {
    if (!password) return
    setLoading(true)
    setLoadError(null)
    try {
      setShows(sortShows(await listShows(password)))
      setAuthed(true)
    } catch (err) {
      if (err instanceof AdminAuthError) logout()
      else setLoadError('Could not load shows. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [password, logout])

  // Restore a session on page load if a password is still stored from this tab session.
  // Fires at most once: handleLogin already loads shows itself before it sets `password`,
  // so reacting to `password` changing would fire a second, redundant listShows on every
  // login. The ref (not an empty dep array) keeps the deps honest and survives StrictMode's
  // double-invoke in development, which would otherwise double-fetch on mount.
  const restoreAttempted = useRef(false)
  useEffect(() => {
    if (restoreAttempted.current) return
    restoreAttempted.current = true
    // Kicking off a fetch is the whole point of this effect, and refresh() sets loading
    // state before it awaits. There is no render-time way to restore a session, so the
    // rule has nothing better to offer here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (password) void refresh()
  }, [password, refresh])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (loggingIn) return
    setLoginError(null)
    setLoggingIn(true)
    try {
      const loaded = await listShows(pwInput)
      sessionStorage.setItem(PW_KEY, pwInput)
      setShows(sortShows(loaded))
      setPassword(pwInput)
      setAuthed(true)
    } catch (err) {
      setLoginError(
        err instanceof AdminAuthError ? 'Incorrect password.' : 'Could not reach the server.',
      )
    } finally {
      setLoggingIn(false)
    }
  }

  function openAdd() {
    setFormErrors({})
    setSaveError(null)
    setEditing({ ...EMPTY_SHOW })
  }

  function openEdit(show: AdminShow) {
    setFormErrors({})
    setSaveError(null)
    setEditing({ ...show })
  }

  function setField<K extends keyof AdminShow>(key: K, value: AdminShow[K]) {
    setEditing((prev) => (prev ? { ...prev, [key]: value } : prev))
    if (formErrors[key as string]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[key as string]
        return next
      })
    }
  }

  function selectArtist(slug: string) {
    const match = PUBLIC_ARTISTS.find((a) => a.slug === slug)
    setEditing((prev) =>
      prev ? { ...prev, artist: slug, artist_display: match?.name ?? '' } : prev,
    )
    if (formErrors.artist) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next.artist
        return next
      })
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing || saving) return
    const errs = validateShow(editing)
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      // Update the list from the returned record — no full re-fetch, feels instant.
      if (editing.id) {
        const saved = await updateShow(password, editing.id, editing)
        setShows((prev) => sortShows(prev.map((s) => (s.id === saved.id ? saved : s))))
      } else {
        const saved = await addShow(password, editing)
        setShows((prev) => sortShows([...prev, saved]))
      }
      setEditing(null)
    } catch (err) {
      if (err instanceof AdminAuthError) logout()
      else setSaveError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(show: AdminShow) {
    if (!show.id || deletingId) return
    if (!window.confirm(`Delete ${show.artist_display} — ${show.date}?`)) return
    setDeletingId(show.id)
    try {
      await deleteShow(password, show.id)
      setShows((prev) => prev.filter((s) => s.id !== show.id))
    } catch (err) {
      if (err instanceof AdminAuthError) logout()
      else setLoadError(err instanceof Error ? err.message : 'Could not delete.')
    } finally {
      setDeletingId(null)
    }
  }

  // --- Login gate ----------------------------------------------------------
  if (!authed) {
    return (
      <main id="main-content" tabIndex={-1} className="bg-base min-h-[100dvh] flex items-center justify-center px-6 outline-none">
        <form onSubmit={handleLogin} className="w-full max-w-sm" noValidate>
          <h1 className="font-display text-ink text-4xl mb-2">SHOWS ADMIN</h1>
          <p className="font-grotesk text-[var(--ink-50)] text-sm mb-8">
            Enter the admin password to manage upcoming shows.
          </p>
          <label htmlFor="admin-pw" className="font-grotesk text-sm text-[var(--ink-72)] mb-1 block">
            Password
          </label>
          <input
            id="admin-pw"
            type="password"
            autoComplete="current-password"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            className={INPUT_CLS}
            autoFocus
          />
          {loginError && (
            <p role="alert" className="font-body text-xs text-[var(--error)] mt-2">
              {loginError}
            </p>
          )}
          <button
            type="submit"
            disabled={loggingIn || !pwInput}
            className="mt-6 w-full inline-flex items-center justify-center bg-accent text-ink font-grotesk font-medium py-3.5 rounded-full text-[1rem] accent-press edge-refract disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
          >
            {loggingIn ? 'Checking…' : 'Log in'}
          </button>
          <Link
            to="/"
            className="mt-6 block text-center font-grotesk text-sm text-[var(--ink-50)] underline"
          >
            Back to site
          </Link>
        </form>
      </main>
    )
  }

  // --- Dashboard -----------------------------------------------------------
  return (
    <main id="main-content" tabIndex={-1} className="bg-base min-h-[100dvh] px-6 md:px-10 py-10 md:py-16 outline-none">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="font-display text-ink text-4xl md:text-6xl">UPCOMING SHOWS</h1>
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--bg-line)] px-5 font-grotesk text-sm text-[var(--ink-72)] hover:bg-raise transition-colors"
          >
            <SignOut size={18} aria-hidden="true" />
            Log out
          </button>
        </div>

        {/* Add / Edit form */}
        {editing ? (
          <form
            onSubmit={handleSave}
            noValidate
            className="mb-10 rounded-2xl bg-raise edge-refract p-6 md:p-8"
          >
            <h2 className="font-display text-ink text-2xl mb-6">
              {editing.id ? 'Edit show' : 'Add show'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Artist" error={formErrors.artist} htmlFor="f-artist" required>
                <select
                  id="f-artist"
                  value={editing.artist}
                  onChange={(e) => selectArtist(e.target.value)}
                  className={`${INPUT_CLS} appearance-none`}
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" disabled>
                    Select artist…
                  </option>
                  {PUBLIC_ARTISTS.map((a) => (
                    <option key={a.slug} value={a.slug} className="bg-base text-white">
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Date" error={formErrors.date} htmlFor="f-date" required>
                <input
                  id="f-date"
                  type="date"
                  value={editing.date}
                  onChange={(e) => setField('date', e.target.value)}
                  className={INPUT_CLS}
                  style={{ colorScheme: 'dark' }}
                />
              </Field>

              <Field label="Time" error={undefined} htmlFor="f-time">
                <input
                  id="f-time"
                  type="time"
                  value={to24h(editing.time)}
                  onChange={(e) => setField('time', to12h(e.target.value))}
                  className={INPUT_CLS}
                  style={{ colorScheme: 'dark' }}
                />
              </Field>

              <Field label="Venue" error={formErrors.venue} htmlFor="f-venue" required>
                <input
                  id="f-venue"
                  type="text"
                  maxLength={80}
                  placeholder="The Factory"
                  value={editing.venue}
                  onChange={(e) => setField('venue', e.target.value)}
                  className={INPUT_CLS}
                />
              </Field>

              <Field label="City" error={formErrors.city} htmlFor="f-city" required>
                <input
                  id="f-city"
                  type="text"
                  maxLength={80}
                  placeholder="Colombo"
                  value={editing.city}
                  onChange={(e) => setField('city', e.target.value)}
                  className={INPUT_CLS}
                />
              </Field>
            </div>

            {saveError && (
              <p role="alert" className="font-body text-sm text-[var(--error)] mt-4">
                {saveError}
              </p>
            )}

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[44px] items-center justify-center bg-accent text-ink font-grotesk font-medium px-7 rounded-full text-[1rem] accent-press edge-refract disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Add show'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--bg-line)] px-7 font-grotesk text-[var(--ink-72)] hover:bg-base transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={openAdd}
            className="mb-8 inline-flex min-h-[44px] items-center gap-2 bg-accent text-ink font-grotesk font-medium px-6 rounded-full accent-press edge-refract"
          >
            <Plus size={18} weight="bold" aria-hidden="true" />
            Add show
          </button>
        )}

        {/* States */}
        {loadError && (
          <p role="alert" className="font-body text-sm text-[var(--error)] mb-4">
            {loadError}
          </p>
        )}

        {loading && shows.length === 0 ? (
          <p className="font-grotesk text-[var(--ink-50)]">Loading…</p>
        ) : shows.length === 0 ? (
          <p className="font-grotesk text-[var(--ink-50)]">
            No shows yet. Add one and it appears on the homepage.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shows.map((show) => (
              <li
                key={show.id}
                className="flex items-center gap-4 rounded-xl bg-raise edge-refract px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-grotesk text-ink font-medium truncate">
                    {show.artist_display || '—'}
                  </p>
                  <p className="font-grotesk text-sm text-[var(--ink-50)] truncate">
                    <span className="text-accent-ink">{prettyDate(show.date)}</span>
                    {show.time ? ` · ${to12h(show.time) || show.time}` : ''}
                    {' — '}
                    {[show.venue, show.city].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(show)}
                  aria-label={`Edit ${show.artist_display}`}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--ink-72)] hover:bg-base transition-colors"
                >
                  <PencilSimple size={20} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(show)}
                  disabled={deletingId === show.id}
                  aria-label={`Delete ${show.artist_display}`}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--error)] hover:bg-base transition-colors disabled:opacity-50"
                >
                  <Trash size={20} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

function Field({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="font-grotesk text-sm text-[var(--ink-72)] mb-1 block">
        {label}
        {required && (
          <span className="text-accent2 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p role="alert" className="font-body text-xs text-[var(--error)] mt-1">
          {error}
        </p>
      )}
    </div>
  )
}
