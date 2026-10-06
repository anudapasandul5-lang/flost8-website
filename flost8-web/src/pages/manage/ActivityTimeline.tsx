import { useCallback, type ReactNode } from 'react'
import { fetchActivity } from '../../lib/manage/api'
import { useLoad } from '../../lib/manage/hooks'
import { statusLabel } from '../../lib/manage/status'
import type { ActivityRow, Manager } from '../../lib/manage/types'
import { ErrorPanel } from './ui'

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

function describe(a: ActivityRow, managers: Manager[]): ReactNode {
  const d = a.data
  const name = (id: unknown) => (typeof id === 'string' ? (managers.find((m) => m.id === id)?.name ?? 'someone') : 'nobody')
  switch (a.kind) {
    case 'comment':
      return <span className="whitespace-pre-wrap break-words">{String(d.text ?? '')}</span>
    case 'status':
      return `Status changed from ${statusLabel(String(d.from))} to ${statusLabel(String(d.to))}`
    case 'owner':
      return `Owner changed from ${name(d.from)} to ${name(d.to)}`
    case 'contract':
      return d.signed ? 'Contract marked as signed' : 'Contract marked as not signed'
    case 'money':
      return 'Money details updated' // the database never stores amounts here
    case 'created':
      return `Inquiry added (${String(d.source ?? 'unknown source').replace('_', ' ')})`
    default:
      return a.kind
  }
}

export default function ActivityTimeline({ inquiryId, managers, version }: { inquiryId: string; managers: Manager[]; version: number }) {
  // `version` is bumped after a change so the timeline re-reads; it is part of the loader identity.
  const load = useCallback(() => fetchActivity(inquiryId).then((rows) => ({ rows, version })), [inquiryId, version])
  const { state, retry } = useLoad(load)

  if (state.status === 'loading') return <div className="h-16 animate-pulse rounded-2xl bg-[var(--bg-raise)]" aria-busy="true" />
  if (state.status === 'error') return <ErrorPanel message={state.message} onRetry={retry} />
  const rows = state.data.rows
  if (rows.length === 0) return <p className="font-grotesk text-sm text-[var(--ink-50)]">No activity yet.</p>

  return (
    <ol className="space-y-3">
      {rows.map((a) => (
        <li key={a.id} className="border-l-2 border-[var(--bg-line)] pl-4">
          <p className="font-grotesk text-[12px] text-[var(--ink-50)]">
            {a.actor_id ? (managers.find((m) => m.id === a.actor_id)?.name ?? 'Someone') : 'System'}, {when(a.created_at)}
          </p>
          <p className={`font-grotesk text-[15px] ${a.kind === 'comment' ? 'text-ink' : 'text-[var(--ink-72)]'}`}>{describe(a, managers)}</p>
        </li>
      ))}
    </ol>
  )
}
