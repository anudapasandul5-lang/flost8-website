import { useEffect, type ReactNode } from 'react'
import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { STATUS_COLOR, STATUS_LABEL } from '../../lib/manage/status'
import type { Status } from '../../lib/manage/types'
import { BTN_GHOST, BTN_PRIMARY } from './styles'
import { useLockScroll } from './useLockScroll'

export function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_COLOR[status]
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-3 py-1 font-grotesk text-[13px] font-medium"
      style={{ color: c.fg, backgroundColor: c.bg }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] p-6 text-center">
      <p className="font-grotesk text-[var(--error)]">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${BTN_GHOST} mt-4`}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-[84px] animate-pulse rounded-2xl bg-[var(--bg-raise)]" />
      ))}
    </div>
  )
}

export interface ToastMsg {
  kind: 'ok' | 'error'
  text: string
  retry?: () => void
}

export function Toast({ toast, onDone }: { toast: ToastMsg | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast || toast.retry) return
    const t = window.setTimeout(onDone, 4500)
    return () => window.clearTimeout(t)
  }, [toast, onDone])
  if (!toast) return null
  const Icon = toast.kind === 'ok' ? CheckCircle : WarningCircle
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[80] flex justify-center px-4 lg:bottom-4">
      <div
        role="status"
        className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3 font-grotesk text-[15px] text-ink shadow-[0_8px_30px_rgba(10,4,14,0.6)] ${
          toast.kind === 'ok' ? 'border-[var(--accent-line)] bg-[#241433]' : 'border-[#7a2f3a] bg-[#2b1219]'
        }`}
      >
        <Icon size={22} weight="fill" aria-hidden="true" className={toast.kind === 'ok' ? 'text-[#86EFAC]' : 'text-[var(--error)]'} />
        {toast.text}
        {toast.retry && <button type="button" onClick={toast.retry} className={`${BTN_GHOST} shrink-0`}>Retry</button>}
        {toast.retry && <button type="button" onClick={onDone} aria-label="Dismiss notification" className={BTN_GHOST}>Dismiss</button>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  body: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useLockScroll(true)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 md:items-center" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="font-display text-3xl text-ink">
          {title}
        </h2>
        <p className="mt-3 font-grotesk text-[1rem] leading-relaxed text-[var(--ink-72)]">{body}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" autoFocus onClick={onCancel} className={BTN_GHOST}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={BTN_PRIMARY}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Shown for 5 s after a one-tap action. The write is held until the timer ends, so Undo just cancels it. */
export function UndoToast({ text, onUndo }: { text: string; onUndo: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[80] flex justify-center px-4 lg:bottom-4">
      <div role="status" className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-[var(--accent-line)] bg-[#241433] py-1 pl-4 pr-2 font-grotesk text-[15px] text-ink shadow-[0_8px_30px_rgba(10,4,14,0.6)]">
        <CheckCircle size={22} weight="fill" aria-hidden="true" className="shrink-0 text-[#86EFAC]" />
        <span className="min-w-0 flex-1 truncate">{text}</span>
        <button type="button" onClick={onUndo} className="inline-flex min-h-[44px] items-center px-3 font-semibold text-[var(--accent-ink)] hover:underline">
          Undo
        </button>
      </div>
    </div>
  )
}
