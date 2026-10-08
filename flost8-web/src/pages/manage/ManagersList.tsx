import { REASON_COLOR, FOCUS_RING } from './styles'
import type { Reason } from '../../lib/manage/needsAction'
import NudgeControl from './NudgeControl'
import { useManagerWhatsapps } from './useManagerWhatsapps'

export interface ManagerRow {
  id: string
  name: string
  artistCount: number
  open: number
  /** Most urgent reason in this manager's open items; colours the count. */
  top: Reason | null
  /** Owner only: next-step lines for this manager's open items. Leave undefined and no Nudge control shows. */
  nudgeLines?: string[]
}

/** Owner only. Tap a manager to look at just their rows everywhere; tap again to clear. */
export default function ManagersList({
  rows,
  selectedId,
  onSelect,
}: {
  rows: ManagerRow[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { numbers, save } = useManagerWhatsapps(rows.some((r) => r.nudgeLines))
  if (rows.length === 0) return null
  return (
    <section aria-labelledby="managers-h">
      <h3 id="managers-h" className="mb-3 font-grotesk text-[16px] font-medium text-ink">
        Managers
      </h3>
      <ul className="space-y-1">
        {rows.map((m) => {
          const on = selectedId === m.id
          return (
            <li key={m.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(on ? null : m.id)}
                className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl px-2.5 text-left transition ${
                  on ? 'bg-[var(--accent-soft)] shadow-[inset_0_0_0_1px_var(--accent-line)]' : 'hover:bg-white/5'
                } ${FOCUS_RING}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <i className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#221330] text-[12px] font-semibold not-italic text-ink" aria-hidden="true">
                    {m.name.charAt(0)}
                  </i>
                  <span className="min-w-0">
                    <span className="block truncate font-grotesk text-[14.5px] font-medium text-ink">{m.name}</span>
                    <span className="block font-grotesk text-[11.5px] text-[var(--ink-50)]">
                      {m.artistCount} {m.artistCount === 1 ? 'artist' : 'artists'}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 font-grotesk text-[12.5px] font-medium" style={{ color: m.open && m.top ? REASON_COLOR[m.top] : 'var(--ink-50)' }}>
                  {m.open === 0 ? 'all clear' : `${m.open} open`}
                </span>
              </button>
              {m.nudgeLines && (
                <div className="flex justify-end px-2.5 pb-1.5">
                  <NudgeControl name={m.name} lines={m.nudgeLines} whatsapp={numbers.get(m.id)} onSave={(n) => save(m.id, n)} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
