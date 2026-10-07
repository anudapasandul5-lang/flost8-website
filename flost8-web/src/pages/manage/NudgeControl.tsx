import { useId, useState, type FormEvent } from 'react'
import { ChatCircle } from '@phosphor-icons/react'
import { buildNudgeMessage, nudgeUrl } from '../../lib/manage/nudge'
import { nudgeErrorText } from '../../lib/manage/nudgeApi'
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL } from './styles'

/**
 * Owner only (the caller decides). With a number: a Nudge link that opens WhatsApp with the message written, and a
 * "Change number" button (a saved number that is wrong must be fixable). Without one: a small "Add WhatsApp number" form.
 */
export default function NudgeControl({
  name,
  lines,
  whatsapp,
  onSave,
}: {
  name: string
  /** Next-step lines for this manager's open items. */
  lines: string[]
  whatsapp: string | undefined
  /** A typed number, or null to remove the saved one. */
  onSave: (input: string | null) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputId = useId()

  const open = () => {
    setValue(whatsapp ?? '')
    setError(null)
    setEditing(true)
  }

  async function save(input: string | null) {
    setBusy(true)
    setError(null)
    try {
      await onSave(input)
      setEditing(false)
      setValue('')
    } catch (err) {
      setError(nudgeErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (!editing && whatsapp) {
    const message = buildNudgeMessage(name, lines)
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={open} aria-label={`Change WhatsApp number for ${name}`} className={BTN_GHOST}>
          Change number
        </button>
        {message ? (
          <a href={nudgeUrl(whatsapp, message)} target="_blank" rel="noopener noreferrer" aria-label={`Nudge ${name} on WhatsApp (opens in a new tab)`} className={BTN_GHOST}>
            <ChatCircle size={18} aria-hidden="true" />
            Nudge
          </a>
        ) : (
          <button type="button" disabled className={BTN_GHOST}>
            Nothing to nudge
          </button>
        )}
      </div>
    )
  }

  if (!editing)
    return (
      <button type="button" onClick={open} aria-label={`Add WhatsApp number for ${name}`} className={BTN_GHOST}>
        Add WhatsApp number
      </button>
    )

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        void save(value)
      }}
      onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
      className="w-full space-y-2"
    >
      <label htmlFor={inputId} className={LABEL}>
        {name}'s WhatsApp number
      </label>
      <input
        id={inputId}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="+94 77 123 4567"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-err` : undefined}
        className={INPUT}
      />
      {error && (
        <p id={`${inputId}-err`} role="alert" className="font-grotesk text-sm text-[var(--error)]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={BTN_PRIMARY}>
          {busy ? 'Saving' : 'Save number'}
        </button>
        {whatsapp && (
          <button type="button" disabled={busy} onClick={() => void save(null)} className={BTN_GHOST}>
            Remove number
          </button>
        )}
        <button type="button" onClick={() => setEditing(false)} className={BTN_GHOST}>
          Cancel
        </button>
      </div>
    </form>
  )
}
