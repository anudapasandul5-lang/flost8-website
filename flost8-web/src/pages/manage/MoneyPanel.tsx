import { useState } from 'react'
import { Lock } from '@phosphor-icons/react'
import { friendlyError, saveMoney } from '../../lib/manage/api'
import { formatAmount, parseAmountInput } from '../../lib/manage/money'
import type { Currency, Inquiry, Money } from '../../lib/manage/types'
import SelectMenu from './SelectMenu'
import { BTN_GHOST, BTN_PRIMARY, INPUT, LABEL, PANEL } from './styles'
import type { ToastMsg } from './ui'

type NumKey = 'fee' | 'advance' | 'balance' | 'total' | 'booking_fee'
const FIELDS: { key: NumKey; label: string }[] = [
  { key: 'fee', label: 'Quote (fee)' },
  { key: 'advance', label: 'Deposit (advance)' },
  { key: 'balance', label: 'Balance' },
  { key: 'total', label: 'Total' },
  { key: 'booking_fee', label: 'Booking fee' },
]

const toText = (n: number | null) => (n === null ? '' : String(n))

export default function MoneyPanel({
  inquiry,
  canEdit,
  onSaved,
  notify,
}: {
  inquiry: Inquiry
  canEdit: boolean
  onSaved: () => void
  notify: (t: ToastMsg) => void
}) {
  const m = inquiry.money
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currency, setCurrency] = useState<Currency>(m?.currency ?? 'LKR')
  const [text, setText] = useState<Record<NumKey, string>>({
    fee: toText(m?.fee ?? null),
    advance: toText(m?.advance ?? null),
    balance: toText(m?.balance ?? null),
    total: toText(m?.total ?? null),
    booking_fee: toText(m?.booking_fee ?? null),
  })
  const [note, setNote] = useState(m?.balance_note ?? '')

  function startEdit() {
    setCurrency(m?.currency ?? 'LKR')
    setText({
      fee: toText(m?.fee ?? null),
      advance: toText(m?.advance ?? null),
      balance: toText(m?.balance ?? null),
      total: toText(m?.total ?? null),
      booking_fee: toText(m?.booking_fee ?? null),
    })
    setNote(m?.balance_note ?? '')
    setError(null)
    setEditing(true)
  }

  async function save() {
    const parsed: Partial<Record<NumKey, number | null>> = {}
    for (const f of FIELDS) {
      const v = parseAmountInput(text[f.key])
      if (v === undefined) {
        setError(`"${f.label}" must be a number, for example 150000.`)
        return
      }
      parsed[f.key] = v
    }
    if ([parsed.fee, parsed.advance].some((v) => v != null && v < 0)) {
      setError('Quote and deposit cannot be negative.')
      return
    }
    const next: Money = {
      currency,
      fee: parsed.fee ?? null,
      advance: parsed.advance ?? null,
      balance: parsed.balance ?? null,
      total: parsed.total ?? null,
      booking_fee: parsed.booking_fee ?? null,
      balance_note: note.trim() || null,
    }
    setBusy(true)
    setError(null)
    try {
      await saveMoney(inquiry.id, next)
      notify({ kind: 'ok', text: 'Money details saved' })
      setEditing(false)
      onSaved()
    } catch (err) {
      notify({ kind: 'error', text: friendlyError(err) })
    } finally {
      setBusy(false)
    }
  }

  if (!m && !canEdit)
    return (
      <section aria-label="Money" className={`${PANEL} flex items-start gap-3 p-4`}>
        <Lock size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--ink-50)]" />
        <p className="font-grotesk text-[15px] text-[var(--ink-72)]">Money details are private to the artist&apos;s manager.</p>
      </section>
    )

  if (editing)
    return (
      <section aria-label="Money" className={`${PANEL} p-4`}>
        <h3 className="mb-4 font-display text-2xl text-ink">MONEY</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mo-cur" className={LABEL}>
              Currency
            </label>
            <SelectMenu
              id="mo-cur"
              value={currency}
              onChange={(v) => setCurrency(v as Currency)}
              options={[
                { value: 'LKR', label: 'LKR (rupees)' },
                { value: 'USD', label: 'USD (dollars)' },
              ]}
            />
          </div>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={`mo-${f.key}`} className={LABEL}>
                {f.label}
              </label>
              <input
                id={`mo-${f.key}`}
                inputMode="decimal"
                value={text[f.key]}
                onChange={(e) => setText((t) => ({ ...t, [f.key]: e.target.value }))}
                className={INPUT}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label htmlFor="mo-note" className={LABEL}>
              Balance note (for words like POSTPONED)
            </label>
            <input id="mo-note" value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} />
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 font-grotesk text-sm text-[var(--error)]">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className={BTN_PRIMARY} disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving...' : 'Save money details'}
          </button>
          <button type="button" className={BTN_GHOST} disabled={busy} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </section>
    )

  return (
    <section aria-label="Money" className={`${PANEL} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl text-ink">MONEY</h3>
        {canEdit && (
          <button type="button" className={BTN_GHOST} onClick={startEdit}>
            {m ? 'Edit money' : 'Add money details'}
          </button>
        )}
      </div>
      {m ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {FIELDS.map((f) => {
            const isBalance = f.key === 'balance'
            const value = m[f.key]
            if (value === null && !(isBalance && m.balance_note)) return null
            return (
              <div key={f.key} className="min-w-0">
                <dt className="font-grotesk text-[13px] text-[var(--ink-50)]">{f.label}</dt>
                <dd className="break-words font-grotesk text-[1.0625rem] font-medium tabular-nums text-ink">
                  {value !== null ? formatAmount(value, m.currency) : m.balance_note}
                  {isBalance && value !== null && m.balance_note && (
                    <span className="block text-sm font-normal text-[var(--ink-72)]">{m.balance_note}</span>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      ) : (
        <p className="font-grotesk text-[15px] text-[var(--ink-72)]">No money recorded yet.</p>
      )}
    </section>
  )
}
