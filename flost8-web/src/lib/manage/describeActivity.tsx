import type { ReactNode } from 'react'
import { statusLabel } from './status'
import type { ActivityRow, Manager } from './types'

/** Plain-English line for one activity row. Shared by the event timeline and the dashboard feed. */
export function describeActivity(a: ActivityRow, managers: Manager[]): ReactNode {
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
