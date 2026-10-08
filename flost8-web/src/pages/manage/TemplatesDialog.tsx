import { useCallback, useState } from 'react'
import { friendlyError } from '../../lib/manage/api'
import { fetchTemplates, saveTemplate, setTemplateArchived } from '../../lib/manage/contactsApi'
import { useLoad } from '../../lib/manage/hooks'
import { Sheet } from './contactUi'
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL } from './styles'
import { ErrorPanel } from './ui'

interface Draft {
  id?: string
  title: string
  language: string
  body: string
}

/** The shared WhatsApp template library. Anyone can add, edit or archive; every message is labelled with its language. */
export default function TemplatesDialog({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const load = useCallback(() => fetchTemplates(), [])
  const { state, refresh, retry } = useLoad(load)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!draft) return
    if (!draft.title.trim() || !draft.body.trim()) return setError('Give it a title and a message.')
    setBusy(true)
    setError(null)
    try {
      await saveTemplate(draft)
      setDraft(null)
      refresh()
      onChanged()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function archive(id: string, archived: boolean) {
    try {
      await setTemplateArchived(id, archived)
      refresh()
      onChanged()
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  return (
    <Sheet title="MESSAGE TEMPLATES" intro="Shared by everyone. Use {name}, {date}, {venue}, {event} and {me} and they fill in on their own." onClose={onClose} busy={busy}>
      {error && (
        <p role="alert" className="font-grotesk text-[14.5px] text-[var(--error)]">
          {error}
        </p>
      )}
      {draft ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <div className="grid grid-cols-[1fr_9rem] gap-3">
            <div>
              <label htmlFor="tp-title" className={LABEL}>Title</label>
              <input id="tp-title" autoComplete="off" maxLength={80} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label htmlFor="tp-lang" className={LABEL}>Language</label>
              <input id="tp-lang" list="tp-langs" autoComplete="off" maxLength={30} value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value })} className={INPUT} />
              <datalist id="tp-langs">
                <option value="English" />
                <option value="Sinhala" />
                <option value="Tamil" />
              </datalist>
            </div>
          </div>
          <div>
            <label htmlFor="tp-body" className={LABEL}>Message</label>
            <textarea id="tp-body" rows={6} maxLength={2000} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className={`${INPUT} resize-y`} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setDraft(null)} disabled={busy} className={`${BTN_GHOST} flex-1`}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={`${BTN_PRIMARY} flex-1`}>
              {busy ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </form>
      ) : state.status === 'loading' ? (
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--bg-raise)]" aria-busy="true" />
      ) : state.status === 'error' ? (
        <ErrorPanel message={state.message} onRetry={retry} />
      ) : (
        <>
          <button type="button" onClick={() => setDraft({ title: '', language: 'English', body: '' })} className={`${BTN_PRIMARY} w-full`}>
            New template
          </button>
          <ul className="space-y-3">
            {state.data
              .filter((t) => showArchived || !t.archived)
              .map((t) => (
                <li key={t.id} className={`${PANEL} p-4 ${t.archived ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-grotesk text-[1rem] font-medium text-ink">{t.title}</p>
                    <span className="shrink-0 rounded-full border border-[var(--bg-line)] px-2.5 py-0.5 font-grotesk text-[12.5px] text-[var(--ink-72)]">{t.language}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap font-grotesk text-[14.5px] text-[var(--ink-72)]">{t.body}</p>
                  <div className="mt-3 flex gap-2">
                    {!t.archived && (
                      <button type="button" onClick={() => setDraft({ id: t.id, title: t.title, language: t.language, body: t.body })} className={BTN_GHOST}>
                        Edit
                      </button>
                    )}
                    <button type="button" onClick={() => void archive(t.id, !t.archived)} className={BTN_GHOST}>
                      {t.archived ? 'Restore' : 'Archive'}
                    </button>
                  </div>
                </li>
              ))}
          </ul>
          {state.data.some((t) => t.archived) && (
            <button type="button" onClick={() => setShowArchived((v) => !v)} aria-pressed={showArchived} className={BTN_GHOST}>
              {showArchived ? 'Hide archived' : 'Show archived'}
            </button>
          )}
        </>
      )}
    </Sheet>
  )
}
