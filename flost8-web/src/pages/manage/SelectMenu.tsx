import { useEffect, useRef, useState } from 'react'
import { Check, CaretDown } from '@phosphor-icons/react'
import { INPUT } from './styles'

export interface SelectOption {
  value: string
  label: string
}

/**
 * A dropdown that looks like the rest of /manage. The browser's own <select> popup cannot be themed (white
 * margins, system blue highlight), so this is a button plus a listbox with the usual keys:
 * Up/Down/Home/End move, Enter or Space picks, Escape closes.
 */
export default function SelectMenu({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = Math.max(0, options.findIndex((o) => o.value === value))
  const [active, setActive] = useState(selected)
  const wrap = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  // Keep the highlighted option in view while arrowing through a long list.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const openMenu = () => {
    setActive(selected)
    setOpen(true)
  }
  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        openMenu()
      }
      return
    }
    if (e.key === 'ArrowDown') setActive((a) => Math.min(options.length - 1, a + 1))
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(options.length - 1)
    else if (e.key === 'Enter' || e.key === ' ') pick(options[active].value)
    else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Tab') setOpen(false)
    else return
    e.preventDefault()
  }

  return (
    <div ref={wrap} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`${INPUT} justify-between gap-3 text-left`}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        <span className="truncate">{options[selected]?.label}</span>
        <CaretDown size={18} aria-hidden="true" className={`shrink-0 text-[var(--ink-50)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[min(18rem,50dvh)] overflow-y-auto overscroll-contain rounded-[14px] border border-[var(--bg-line)] bg-[#24142F] p-1.5 shadow-[0_12px_36px_rgba(10,4,14,0.7)]"
        >
          {options.map((o, n) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setActive(n)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o.value)}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[10px] px-3.5 font-grotesk text-[15px] ${
                n === active ? 'bg-white/10 text-ink' : 'text-[var(--ink-72)]'
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.value === value && <Check size={16} weight="bold" aria-hidden="true" className="shrink-0 text-[var(--accent-ink)]" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
