import type { Artist, Inquiry, Manager } from '../../lib/manage/types'
import ActivityFeed from './ActivityFeed'
import ManagersList, { type ManagerRow } from './ManagersList'
import NextShows from './NextShows'

export interface RightColumnProps {
  me: Manager
  managers: Manager[]
  artists: Artist[]
  /** Upcoming-show source: already limited to what this viewer (and the manager filter) should see. */
  inquiries: Inquiry[]
  today: string
  conflicts: ReadonlySet<string>
  /** Owner only; ignored for managers. */
  managerRows: ManagerRow[]
  managerFilter: string | null
  onSelectManager: (id: string | null) => void
  onOpen: (inquiryId: string) => void
  /** Anything that changes after a reload (pass `inquiries`); the activity feed re-reads when it changes. */
  version: unknown
}

/**
 * Next shows, Activity, Managers (owner only). Mount it as the third grid column next to Overview at 1280px and up;
 * under that it simply sits below the main column, so no layout wrapper is needed. The Overview mount in Workspace.tsx does this.
 */
export default function RightColumn(p: RightColumnProps) {
  return (
    <aside aria-label="Shows, activity and managers" className="space-y-6 xl:space-y-7">
      <NextShows list={p.inquiries} today={p.today} artists={p.artists} conflicts={p.conflicts} onOpen={p.onOpen} />
      <hr className="border-[var(--bg-line)]" />
      <ActivityFeed managers={p.managers} version={p.version} />
      {p.me.role === 'owner' && (
        <>
          <hr className="border-[var(--bg-line)]" />
          <ManagersList rows={p.managerRows} selectedId={p.managerFilter} onSelect={p.onSelectManager} />
        </>
      )}
    </aside>
  )
}
