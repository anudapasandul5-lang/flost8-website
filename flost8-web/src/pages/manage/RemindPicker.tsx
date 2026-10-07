import { useState } from 'react'
import { addDaysISO, formatDay } from '../../lib/manage/contacts'
import { CHIP_BASE, CHIP_OFF, CHIP_ON, INPUT } from './styles'

/** "Remind me" chips. `value` is a YYYY-MM-DD day, or '' for no reminder. */
export default function RemindPicker({ today, value, onChange, idPrefix, legend, allowNone = true }: { today: string; value: string; onChange: (day: string) => void; idPrefix: string; legend?: string; allowNone?: boolean }) {
  const [custom, setCustom] = useState(false)
  const presets = [
    { label: 'Tomorrow', day: addDaysISO(today, 1) },
    { label: 'In 3 days', day: addDaysISO(today, 3) },
    { label: 'Next week', day: addDaysISO(today, 7) },
  ]
  const chip = (on: boolean) => `${CHIP_BASE} ${on ? CHIP_ON : CHIP_OFF}`
  return (
    <fieldset>
      <legend className="mb-1.5 block font-grotesk text-sm text-[var(--ink-72)]">{legend ?? 'Remind me'} {value ? `on ${formatDay(value)}` : allowNone ? '(optional)' : ''}</legend>
      <div className="flex flex-wrap gap-2">
        {allowNone && (
          <button type="button" aria-pressed={value === '' && !custom} className={chip(value === '' && !custom)} onClick={() => { setCustom(false); onChange('') }}>
            No reminder
          </button>
        )}
        {presets.map((p) => (
          <button key={p.label} type="button" aria-pressed={value === p.day && !custom} className={chip(value === p.day && !custom)} onClick={() => { setCustom(false); onChange(p.day) }}>
            {p.label}
          </button>
        ))}
        <button type="button" aria-pressed={custom} className={chip(custom)} onClick={() => { setCustom(true); if (!value) onChange(addDaysISO(today, 1)) }}>
          Pick a date
        </button>
      </div>
      {custom && (
        <div className="mt-2">
          <label htmlFor={`${idPrefix}-day`} className="sr-only">Reminder date</label>
          <input id={`${idPrefix}-day`} type="date" min={today} value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} style={{ colorScheme: 'dark' }} />
        </div>
      )}
    </fieldset>
  )
}
