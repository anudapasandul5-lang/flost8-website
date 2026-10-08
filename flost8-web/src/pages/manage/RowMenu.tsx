import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { CaretDown, DotsThree } from '@phosphor-icons/react'
import type { MenuItem } from '../../lib/manage/rowMenu'
import { FOCUS_RING } from './styles'

export default function RowMenu({ items, label = 'More actions' }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      setExpanded(null)
      trigger.current?.focus()
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const close = () => {
    setOpen(false)
    setExpanded(null)
  }
  const row = `flex min-h-[44px] w-full items-center gap-3 whitespace-nowrap rounded-[10px] px-3.5 text-left font-grotesk text-[14.5px] text-[var(--ink-72)] hover:bg-white/5 hover:text-ink ${FOCUS_RING}`
  // Arrow keys, Home and End walk the menu's items; Tab leaves and closes it.
  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') return close()
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    if (e.target instanceof HTMLInputElement) return
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    if (items.length === 0) return
    e.preventDefault()
    const at = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : e.key === 'ArrowDown' ? (at + 1) % items.length : (at <= 0 ? items.length : at) - 1
    items[next].focus()
  }
  const hint = (t?: string) => t && <small className="ml-auto whitespace-nowrap text-xs text-[var(--ink-50)]">{t}</small>
  return (
    <div ref={ref} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className={`grid h-12 w-12 place-items-center rounded-full border border-[var(--bg-line)] text-[var(--ink-72)] hover:bg-[var(--bg-raise)] ${FOCUS_RING}`}
      >
        <DotsThree size={24} weight="bold" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" aria-label={label} onKeyDown={onMenuKey} className="absolute right-0 top-[54px] z-30 min-w-[250px] max-w-[calc(100vw-2rem)] rounded-[14px] border border-[var(--bg-line)] bg-[#24142F] p-1.5 shadow-[0_12px_36px_rgba(10,4,14,0.7)]">
          {items.map((it) =>
            it.group ? (
              <div key={it.label}>
                <button type="button" role="menuitem" aria-expanded={expanded === it.label} onClick={() => setExpanded(expanded === it.label ? null : it.label)} className={row}>
                  {it.label}
                  {hint(it.hint)}
                  <CaretDown size={14} aria-hidden="true" className={`shrink-0 transition ${expanded === it.label ? 'rotate-180' : ''}`} />
                </button>
                {expanded === it.label && (
                  <div role="group" aria-label={it.label} className="mb-1 ml-3 border-l border-[var(--bg-line)] pl-1.5">
                    {it.group.map((g) =>
                      g.date ? (
                        <label key={g.label} className={`${row} cursor-pointer`}>
                          {g.label}
                          <input
                            type="date"
                            min={g.date.min}
                            aria-label={g.label}
                            onChange={(e) => {
                              if (!e.target.value) return
                              const pick = g.date!.onPick
                              close()
                              pick(e.target.value)
                            }}
                            className="ml-auto h-9 rounded-lg border border-[var(--bg-line)] bg-transparent px-2 text-[16px] text-ink [color-scheme:dark]"
                          />
                        </label>
                      ) : (
                      <button
                        key={g.label}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          close()
                          g.onClick?.()
                        }}
                        className={row}
                      >
                        {g.label}
                      </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            ) : it.href ? (
              <a key={it.label} role="menuitem" href={it.href} {...(it.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})} onClick={close} className={row}>
                {it.label}
                {hint(it.hint)}
              </a>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  close()
                  it.onClick?.()
                }}
                className={row}
              >
                {it.label}
                {hint(it.hint)}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
