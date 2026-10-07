import { useId, useState, type FormEvent } from 'react'
import { ChatCircle } from '@phosphor-icons/react'
import { buildNudgeMessage, nudgeUrl } from '../../lib/manage/nudge'
import { nudgeErrorText } from '../../lib/manage/nudgeApi'
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL } from './styles'

/**
 * Owner only (the caller decides). With a number: a Nudge link that opens WhatsApp with the message written.
 * Without one: the Nudge button is hidden and a small "Add WhatsApp number" form takes its place.
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
  onSave: (input: string) => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputId = useId()

  if (whatsapp) {
    const message = buildNudgeMessage(name, lines)
    if (!message)
      return (
        <button type="button" disabled className={BTN_GHOST}>
          Nothing to nudge
        </button>
      )
    return (
      <a href={nudgeUrl(whatsapp, message)} target="_blank" rel="noopener noreferrer" aria-label={`Nudge ${name} on WhatsApp (opens in a new tab)`} className={BTN_GHOST}>
        <ChatCircle size={18} aria-hidden="true" />
        Nudge
      </a>
    )
  }

  if (!adding)
    return (
      <button type="button" onClick={() => setAdding(true)} aria-label={`Add WhatsApp number for ${name}`} className={BTN_GHOST}>
        Add WhatsApp number
      </button>
    )

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSave(value)
      setAdding(false)
      setValue('')
    } catch (err) {
      setError(nudgeErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} onKeyDown={(e) => e.key === 'Escape' && setAdding(false)} className="w-full space-y-2">
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
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={BTN_PRIMARY}>
          {busy ? 'Saving' : 'Save number'}
        </button>
        <button type="button" onClick={() => setAdding(false)} className={BTN_GHOST}>
          Cancel
        </button>
      </div>
    </form>
  )
}
