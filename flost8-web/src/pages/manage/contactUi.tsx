import { useEffect, type ReactNode } from 'react'
import { X } from '@phosphor-icons/react'
import { STAGE_LABEL, TYPE_LABEL, type ContactType, type Stage } from '../../lib/manage/contacts'
import { BTN_GHOST } from './styles'
import { useLockScroll } from './useLockScroll'

const STAGE_COLOR: Record<Stage, { fg: string; bg: string }> = {
  lead: { fg: '#7DD3FC', bg: 'rgba(125,211,252,0.14)' },
  active: { fg: '#86EFAC', bg: 'rgba(134,239,172,0.16)' },
  past: { fg: '#C88BFF', bg: 'rgba(157,20,255,0.18)' },
  dormant: { fg: '#A1A1AA', bg: 'rgba(161,161,170,0.14)' },
}

export function StageBadge({ stage }: { stage: Stage }) {
  const c = STAGE_COLOR[stage]
  return (
    <span className="inline-flex shrink-0 items-center rounded-full px-3 py-1 font-grotesk text-[13px] font-medium" style={{ color: c.fg, backgroundColor: c.bg }}>
      {STAGE_LABEL[stage]}
    </span>
  )
}

export function TypeTags({ types }: { types: ContactType[] }) {
  if (types.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1.5">
      {types.map((t) => (
        <span key={t} className="rounded-full border border-[var(--bg-line)] px-2.5 py-0.5 font-grotesk text-[12.5px] text-[var(--ink-72)]">
          {TYPE_LABEL[t]}
        </span>
      ))}
    </span>
  )
}

/**
 * Modal sheet that matches Add event: a bottom sheet on a phone, a side drawer from 768px up.
 * `z` is above the contact drawer (70) and below toasts (80).
 */
export function Sheet({
  title,
  intro,
  onClose,
  busy,
  children,
  wide,
}: {
  title: string
  intro?: string
  onClose: () => void
  busy?: boolean
  children: ReactNode
  wide?: boolean
}) {
  useLockScroll(true)
  useEffect(() => {
    // Capture phase + stopPropagation: Escape closes only this sheet, not the drawer underneath it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (!busy) onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose, busy])
  return (
    <div
      className="fixed inset-0 z-[75] bg-black/60"
      onClick={(e) => {
        e.stopPropagation() // a sheet opened from inside a drawer must not close the drawer too
        if (!busy) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-y-auto overscroll-contain rounded-t-3xl border border-b-0 border-[var(--bg-line)] bg-base md:inset-y-0 md:left-auto md:right-0 md:max-h-none ${wide ? 'md:w-[620px]' : 'md:w-[480px]'} md:rounded-none md:border-b md:border-r-0`}
      >
        <div className="flex items-center justify-between px-4 pb-1 pt-4 md:px-6">
          <h2 className="font-display text-3xl leading-none text-ink">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} disabled={busy} className={`${BTN_GHOST} !h-11 !w-11 !min-h-0 !p-0`}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {intro && <p className="px-4 pb-4 font-grotesk text-[13.5px] text-[var(--ink-72)] md:px-6">{intro}</p>}
        <div className="space-y-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 md:px-6">{children}</div>
      </div>
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-[var(--bg-line)] p-5 text-center font-grotesk text-[15px] text-[var(--ink-72)]">{children}</p>
}
