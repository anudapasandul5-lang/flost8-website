import { useCallback, useMemo, useState } from 'react'
import { ArrowSquareOut, Copy } from '@phosphor-icons/react'
import { addContactNote, fetchTemplates } from '../../lib/manage/contactsApi'
import { fillTemplate, type Contact, type MessageTemplate } from '../../lib/manage/contacts'
import { useLoad } from '../../lib/manage/hooks'
import { waLink } from '../../lib/manage/needsAction'
import type { Inquiry, Manager } from '../../lib/manage/types'
import { Sheet } from './contactUi'
import { BTN_GHOST, BTN_PRIMARY, CHIP_BASE, CHIP_OFF, CHIP_ON, INPUT, LABEL } from './styles'
import { ErrorPanel, type ToastMsg } from './ui'

/**
 * One-tap WhatsApp: pick a ready message, check the preview, open the chat. The note "Opened WhatsApp" is added to the
 * contact's timeline (switch it off if you do not want that).
 */
export default function WhatsAppSheet({
  me,
  contact,
  inquiry,
  phone,
  name,
  onClose,
  onManageTemplates,
  onLogged,
  notify,
  version,
}: {
  me: Manager
  /** The contact being messaged; null when we only know a phone number from an inquiry. */
  contact: Contact | null
  /** The booking this message is about, for {event} {venue} {date}. */
  inquiry?: Inquiry
  phone: string | null
  name: string
  onClose: () => void
  onManageTemplates: () => void
  onLogged?: () => void
  notify: (t: ToastMsg) => void
  /** Bump to re-read templates after the library was edited. */
  version: number
}) {
  const load = useCallback(() => fetchTemplates().then((rows) => ({ rows, version })), [version])
  const { state, retry } = useLoad(load)
  const [picked, setPicked] = useState<MessageTemplate | null>(null)
  const [language, setLanguage] = useState<string>('')
  const [text, setText] = useState('')
  const [log, setLog] = useState(true)

  const templates = useMemo(() => (state.status === 'ok' ? state.data.rows.filter((t) => !t.archived) : []), [state])
  const languages = useMemo(() => [...new Set(templates.map((t) => t.language))], [templates])
  const wanted = contact?.language
  const activeLanguage = language || (wanted && languages.includes(wanted) ? wanted : languages[0] ?? '')
  const shown = templates.filter((t) => !activeLanguage || t.language === activeLanguage)

  const vars = useMemo(
    () => ({ name, me: me.name, date: inquiry?.event_date, venue: inquiry?.venue, event: inquiry?.event_name }),
    [name, me.name, inquiry],
  )
  const choose = (t: MessageTemplate) => {
    setPicked(t)
    setText(fillTemplate(t.body, vars))
  }

  const base = waLink(phone)
  const href = base ? (text.trim() ? `${base}?text=${encodeURIComponent(text)}` : base) : null

  async function opened() {
    if (!contact || !log) return
    try {
      await addContactNote(contact.id, me.id, 'whatsapp', picked ? `Opened WhatsApp: ${picked.title}` : 'Opened WhatsApp')
      onLogged?.()
    } catch {
      // The chat is already open; a missing timeline note is not worth an error on top of it.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      notify({ kind: 'ok', text: 'Message copied' })
    } catch {
      notify({ kind: 'error', text: 'Could not copy. Select the text and copy it by hand.' })
    }
  }

  return (
    <Sheet title="WHATSAPP" intro={`To ${name}${phone ? ` (${phone})` : ''}`} onClose={onClose}>
      {!base && (
        <p role="note" className="rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] p-4 font-grotesk text-[15px] text-[var(--ink-72)]">
          There is no usable phone number yet. Add one to the contact and this button will work.
        </p>
      )}
      {state.status === 'loading' && <div className="h-20 animate-pulse rounded-2xl bg-[var(--bg-raise)]" aria-busy="true" />}
      {state.status === 'error' && <ErrorPanel message={state.message} onRetry={retry} />}
      {state.status === 'ok' && (
        <>
          {languages.length > 1 && (
            <div role="group" aria-label="Language" className="flex flex-wrap gap-2">
              {languages.map((l) => (
                <button key={l} type="button" aria-pressed={activeLanguage === l} onClick={() => setLanguage(l)} className={`${CHIP_BASE} ${activeLanguage === l ? CHIP_ON : CHIP_OFF}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
          {shown.length === 0 ? (
            <p className="font-grotesk text-[15px] text-[var(--ink-72)]">No templates yet. Add one below, or just type your message.</p>
          ) : (
            <div role="group" aria-label="Templates" className="flex flex-wrap gap-2">
              {shown.map((t) => (
                <button key={t.id} type="button" aria-pressed={picked?.id === t.id} onClick={() => choose(t)} className={`${CHIP_BASE} ${picked?.id === t.id ? CHIP_ON : CHIP_OFF}`}>
                  {t.title}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <div>
        <label htmlFor="wa-text" className={LABEL}>Message (you can edit it)</label>
        <textarea id="wa-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} className={`${INPUT} resize-y`} />
      </div>
      {contact && (
        <label className="flex min-h-[44px] items-center gap-3 font-grotesk text-[14.5px] text-[var(--ink-72)]">
          <input type="checkbox" checked={log} onChange={(e) => setLog(e.target.checked)} className="h-5 w-5 accent-[var(--accent-ink)]" />
          Add to their timeline when I open WhatsApp
        </label>
      )}
      <div className="flex flex-wrap gap-3">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer noopener" onClick={() => void opened()} className={`${BTN_PRIMARY} flex-1`}>
            <ArrowSquareOut size={18} aria-hidden="true" />
            Open WhatsApp
          </a>
        ) : (
          <span aria-disabled="true" className={`${BTN_PRIMARY} flex-1 cursor-not-allowed opacity-50`}>
            Open WhatsApp
          </span>
        )}
        <button type="button" onClick={() => void copy()} disabled={!text.trim()} className={BTN_GHOST}>
          <Copy size={18} aria-hidden="true" />
          Copy
        </button>
        <button type="button" onClick={onManageTemplates} className={BTN_GHOST}>
          Edit templates
        </button>
      </div>
    </Sheet>
  )
}
