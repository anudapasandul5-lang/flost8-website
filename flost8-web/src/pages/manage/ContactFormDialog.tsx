import { useMemo, useRef, useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import { friendlyError, newId } from '../../lib/manage/api'
import { createContact, updateContact } from '../../lib/manage/contactsApi'
import {
  CONTACT_TYPES, EMPTY_CONTACT, findDuplicates, toContactInput, TYPE_LABEL, validateContact,
  type Contact, type ContactInput, type ContactType,
} from '../../lib/manage/contacts'
import type { Manager } from '../../lib/manage/types'
import { Sheet } from './contactUi'
import SelectMenu from './SelectMenu'
import { BTN_GHOST, BTN_PRIMARY, CHIP_BASE, CHIP_OFF, CHIP_ON, INPUT, LABEL } from './styles'

function ListInput({ id, label, values, onChange, type, placeholder }: { id: string; label: string; values: string[]; onChange: (v: string[]) => void; type: 'tel' | 'email'; placeholder: string }) {
  const rows = values.length ? values : ['']
  return (
    <fieldset>
      <legend className={LABEL}>{label}</legend>
      <div className="space-y-2">
        {rows.map((v, n) => (
          <div key={n} className="flex gap-2">
            <input
              id={n === 0 ? id : undefined}
              aria-label={`${label} ${n + 1}`}
              type={type}
              inputMode={type === 'tel' ? 'tel' : 'email'}
              autoComplete="off"
              value={v}
              placeholder={placeholder}
              onChange={(e) => onChange(rows.map((x, i) => (i === n ? e.target.value : x)))}
              className={INPUT}
            />
            {rows.length > 1 && (
              <button type="button" aria-label={`Remove ${label.toLowerCase()} ${n + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== n))} className={`${BTN_GHOST} !w-12 shrink-0 !px-0`}>
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        {rows.length < 10 && (
          <button type="button" onClick={() => onChange([...rows, ''])} className={BTN_GHOST}>
            <Plus size={16} weight="bold" aria-hidden="true" />
            Add another
          </button>
        )}
      </div>
    </fieldset>
  )
}

/** Add or edit a contact. Warns (never blocks) when the name, a phone or an email matches someone already saved. */
export default function ContactFormDialog({
  me,
  managers,
  contacts,
  editing,
  initial,
  onClose,
  onSaved,
  onOpenExisting,
}: {
  me: Manager
  managers: Manager[]
  contacts: Contact[]
  editing?: Contact
  initial?: Partial<ContactInput>
  onClose: () => void
  onSaved: (c: Contact) => void
  onOpenExisting?: (id: string) => void
}) {
  const [f, setF] = useState<ContactInput>(() => (editing ? toContactInput(editing) : { ...EMPTY_CONTACT, owner_id: me.role === 'owner' ? null : me.id, ...initial }))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const contactId = useRef(newId()) // the same id on every retry, so a dropped connection never makes two contacts
  const set = (patch: Partial<ContactInput>) => setF((p) => ({ ...p, ...patch }))

  const twins = useMemo(
    () => findDuplicates({ name: f.name, phones: f.phones, emails: f.emails }, contacts, editing?.id).slice(0, 3),
    [f.name, f.phones, f.emails, contacts, editing?.id],
  )

  const toggleType = (t: ContactType) => set({ types: f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t] })

  async function save() {
    const problem = validateContact(f)
    if (problem) return setError(problem)
    setError(null)
    setBusy(true)
    try {
      if (editing) {
        await updateContact(editing.id, f)
        onSaved({ ...editing })
      } else onSaved(await createContact(f, contactId.current))
    } catch (err) {
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  const chip = (on: boolean) => `${CHIP_BASE} ${on ? CHIP_ON : CHIP_OFF}`
  const ownerOptions = [{ value: '', label: 'Nobody yet' }, ...managers.map((m) => ({ value: m.id, label: m.name }))]

  return (
    <Sheet title={editing ? 'EDIT CONTACT' : 'NEW CONTACT'} intro="Everyone can see and edit contacts. Saved changes are kept in the contact's history." onClose={onClose} busy={busy}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div>
          <label htmlFor="cf-name" className={LABEL}>Name</label>
          <input id="cf-name" name="name" autoComplete="off" value={f.name} onChange={(e) => set({ name: e.target.value })} className={INPUT} required />
        </div>

        <fieldset>
          <legend className={LABEL}>Type (pick any)</legend>
          <div className="flex flex-wrap gap-2">
            {CONTACT_TYPES.map((t) => (
              <button key={t} type="button" aria-pressed={f.types.includes(t)} className={chip(f.types.includes(t))} onClick={() => toggleType(t)}>
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <ListInput id="cf-phone" label="Phone" type="tel" placeholder="077 123 4567" values={f.phones} onChange={(phones) => set({ phones })} />
        <div>
          <label htmlFor="cf-wa" className={LABEL}>WhatsApp number (only if different)</label>
          <input id="cf-wa" name="whatsapp" type="tel" inputMode="tel" autoComplete="off" value={f.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} className={INPUT} />
        </div>
        <ListInput id="cf-email" label="Email" type="email" placeholder="name@company.lk" values={f.emails} onChange={(emails) => set({ emails })} />

        {twins.length > 0 && (
          <div role="status" className="rounded-2xl border border-[#FCD34D]/40 bg-[rgba(252,211,77,0.08)] p-4 font-grotesk text-[14.5px] text-ink">
            <p className="font-medium">This looks like someone already saved:</p>
            <ul className="mt-2 space-y-1">
              {twins.map((t) => (
                <li key={t.id}>
                  {onOpenExisting ? (
                    <button type="button" onClick={() => onOpenExisting(t.id)} className="text-left underline">
                      {t.name}
                    </button>
                  ) : (
                    t.name
                  )}
                  {t.organisation ? ` (${t.organisation})` : ''}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[var(--ink-72)]">You can still save. Duplicates can be merged later from Contacts.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cf-org" className={LABEL}>Organisation</label>
            <input id="cf-org" name="organisation" autoComplete="off" value={f.organisation} onChange={(e) => set({ organisation: e.target.value })} className={INPUT} />
          </div>
          <div>
            <label htmlFor="cf-city" className={LABEL}>City</label>
            <input id="cf-city" name="city" autoComplete="off" value={f.city} onChange={(e) => set({ city: e.target.value })} className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cf-ig" className={LABEL}>Instagram</label>
            <input id="cf-ig" name="instagram" autoComplete="off" value={f.instagram} placeholder="@handle" onChange={(e) => set({ instagram: e.target.value })} className={INPUT} />
          </div>
          <div>
            <label htmlFor="cf-lang" className={LABEL}>Language</label>
            <input id="cf-lang" name="language" list="cf-langs" autoComplete="off" value={f.language} placeholder="English" onChange={(e) => set({ language: e.target.value })} className={INPUT} />
            <datalist id="cf-langs">
              <option value="English" />
              <option value="Sinhala" />
              <option value="Tamil" />
            </datalist>
          </div>
        </div>

        <div>
          <label htmlFor="cf-owner" className={LABEL}>Owner</label>
          <SelectMenu id="cf-owner" value={f.owner_id ?? ''} options={ownerOptions} onChange={(v) => set({ owner_id: v || null })} />
        </div>

        <div>
          <label htmlFor="cf-notes" className={LABEL}>Notes</label>
          <textarea id="cf-notes" name="notes" rows={3} maxLength={10000} value={f.notes} onChange={(e) => set({ notes: e.target.value })} className={`${INPUT} resize-y`} />
        </div>

        {error && (
          <p role="alert" className="font-grotesk text-[14.5px] text-[var(--error)]">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className={`${BTN_GHOST} flex-1`}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={`${BTN_PRIMARY} flex-1`}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add contact'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
