import type { ReactNode } from 'react'
import { ChatCircle } from '@phosphor-icons/react'
import { formatDate } from '../../lib/manage/calendar'
import { ago, bestPhone, type Contact, type ContactStats, type PendingPayment } from '../../lib/manage/contacts'
import { inquiryTitle } from '../../lib/manage/labels'
import { formatAmount } from '../../lib/manage/money'
import type { Manager } from '../../lib/manage/types'
import { EmptyNote } from './contactUi'
import { BTN_GHOST, FOCUS_RING, PANEL } from './styles'

function Count({ n, label }: { n: number; label: string }) {
  return (
    <div className={`${PANEL} min-w-0 p-4`}>
      <p className="font-display text-4xl leading-none text-ink">{n}</p>
      <p className="mt-1 font-grotesk text-[13.5px] text-[var(--ink-72)]">{label}</p>
    </div>
  )
}

/**
 * A salesperson's first screen: what to do today in one place. Follow-ups and the "Needs you" list come in as ready-made
 * nodes (they already know how to act); payments and quiet contacts are drawn here.
 */
export default function TodayView({
  me,
  today,
  followUps,
  followUpCount,
  needs,
  needCount,
  payments,
  quiet,
  stats,
  onOpenInquiry,
  onOpenContact,
  onWhatsApp,
}: {
  me: Manager
  today: string
  followUps: ReactNode
  followUpCount: number
  needs: ReactNode
  needCount: number
  payments: PendingPayment[]
  quiet: Contact[]
  stats: ReadonlyMap<string, ContactStats>
  onOpenInquiry: (id: string) => void
  onOpenContact: (id: string) => void
  onWhatsApp: (c: Contact) => void
}) {
  const nothing = followUpCount === 0 && needCount === 0 && payments.length === 0 && quiet.length === 0
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Count n={followUpCount} label="Follow-ups due" />
        <Count n={needCount} label="Need you" />
        <Count n={payments.length} label="Payments pending" />
        <Count n={quiet.length} label="Gone quiet" />
      </div>

      {nothing && <EmptyNote>All clear, {me.name}. Nothing is due today.</EmptyNote>}

      {followUps}

      {payments.length > 0 && (
        <section aria-label="Payments pending">
          <h2 className="mb-3 font-display text-2xl text-ink">
            PAYMENTS PENDING <span className="text-[var(--ink-50)]">({payments.length})</span>
          </h2>
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.inquiry.id}>
                <button
                  type="button"
                  onClick={() => onOpenInquiry(p.inquiry.id)}
                  className={`${PANEL} flex min-h-[60px] w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 p-3 text-left ${FOCUS_RING}`}
                  style={{ borderLeft: `3px solid ${p.overdue ? '#FF6B6B' : '#FCD34D'}` }}
                >
                  <span className="min-w-0 font-grotesk">
                    <span className="block truncate text-[1rem] text-ink">{inquiryTitle(p.inquiry)}</span>
                    <span className="block text-[13.5px] text-[var(--ink-72)]">
                      {formatDate(p.inquiry.event_date)}
                      {p.overdue ? ', already played' : ''}
                    </span>
                  </span>
                  <span className="font-grotesk text-[14.5px] font-medium text-ink">{p.amount === null ? 'Payment pending' : `${formatAmount(p.amount, p.currency)} owed`}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {needs}

      {quiet.length > 0 && (
        <section aria-label="Gone quiet">
          <h2 className="mb-3 font-display text-2xl text-ink">
            GONE QUIET <span className="text-[var(--ink-50)]">({quiet.length})</span>
          </h2>
          <p className="mb-3 font-grotesk text-[14.5px] text-[var(--ink-72)]">People who booked before and have not been in touch for over 90 days.</p>
          <ul className="space-y-2">
            {quiet.slice(0, 5).map((c) => {
              const s = stats.get(c.id)
              return (
                <li key={c.id} className={`${PANEL} flex items-center gap-3 p-3`}>
                  <button type="button" onClick={() => onOpenContact(c.id)} className={`min-w-0 flex-1 text-left font-grotesk ${FOCUS_RING}`}>
                    <span className="block truncate text-[1rem] text-ink">{c.name}</span>
                    <span className="block text-[13.5px] text-[var(--ink-72)]">{s?.last_booked_date ? `Last booked ${ago(s.last_booked_date, today)}` : 'No recent contact'}</span>
                  </button>
                  {bestPhone(c) && (
                    <button type="button" aria-label={`WhatsApp ${c.name}`} onClick={() => onWhatsApp(c)} className={`${BTN_GHOST} !w-11 shrink-0 !px-0`}>
                      <ChatCircle size={20} aria-hidden="true" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
