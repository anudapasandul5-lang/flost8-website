import { useCallback } from 'react'
import { fetchRecentActivity } from '../../lib/manage/api'
import { collapseFeed } from '../../lib/manage/activityFeed'
import { describeActivity } from '../../lib/manage/describeActivity'
import { useLoad } from '../../lib/manage/hooks'
import { inquiryTitle } from '../../lib/manage/labels'
import type { Manager } from '../../lib/manage/types'
import { ErrorPanel } from './ui'

const SHOWN = 6

function ago(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso))
}

function Dot({ children }: { children: string }) {
  return (
    <i className="grid h-7 w-7 place-items-center rounded-full border border-[var(--bg-line)] bg-[#221330] text-[11px] font-semibold not-italic text-ink" aria-hidden="true">
      {children}
    </i>
  )
}

/** Latest activity on events this person can see. `version` changes after a reload so the feed re-reads. */
export default function ActivityFeed({ managers, version }: { managers: Manager[]; version: unknown }) {
  // 40 raw rows is plenty: the sheet importer's rows collapse into one line per run.
  const load = useCallback(() => fetchRecentActivity(40).then((rows) => ({ rows, version })), [version])
  const { state, retry } = useLoad(load)

  return (
    <section aria-labelledby="activity-h">
      <h3 id="activity-h" className="mb-3 font-grotesk text-[16px] font-medium text-ink">
        Activity
      </h3>
      {state.status === 'loading' ? (
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--bg-raise)]" aria-busy="true" />
      ) : state.status === 'error' ? (
        <ErrorPanel message={state.message} onRetry={retry} />
      ) : (
        (() => {
          const items = collapseFeed(state.data.rows).slice(0, SHOWN)
          if (items.length === 0) return <p className="font-grotesk text-sm text-[var(--ink-50)]">No activity yet.</p>
          return (
            <ol>
              {items.map((it, n) => {
                const last = n === items.length - 1
                const who = it.kind === 'row' ? (managers.find((m) => m.id === it.row.actor_id)?.name ?? 'Someone') : 'Sheet sync'
                return (
                  <li key={it.kind === 'row' ? it.row.id : `sync-${it.at}`} className="relative grid grid-cols-[28px_1fr] gap-2.5 pb-3.5">
                    {!last && <span className="absolute bottom-0.5 left-[13px] top-7 w-px bg-[var(--bg-line)]" aria-hidden="true" />}
                    <Dot>{who.charAt(0).toUpperCase()}</Dot>
                    <div className="min-w-0">
                      {it.kind === 'row' ? (
                        <>
                          <p className="line-clamp-2 break-words font-grotesk text-[13px] text-[var(--ink-72)]">
                            <b className="font-medium text-ink">{who}</b> · {describeActivity(it.row, managers)}
                          </p>
                          <p className="truncate font-grotesk text-[11.5px] text-[var(--ink-50)]">
                            {it.row.inquiry ? `${inquiryTitle({ ...it.row.inquiry, organizer_name: null })} · ` : ''}
                            {ago(it.row.created_at)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-grotesk text-[13px] text-[var(--ink-72)]">
                            <b className="font-medium text-ink">Sheet sync:</b> {it.count} {it.count === 1 ? 'change' : 'changes'}
                          </p>
                          <p className="font-grotesk text-[11.5px] text-[var(--ink-50)]">{ago(it.at)}</p>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )
        })()
      )}
    </section>
  )
}
