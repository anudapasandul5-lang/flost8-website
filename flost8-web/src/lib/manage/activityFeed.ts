import type { ActivityRow } from './types'

/** An activity row plus the event it belongs to (embedded by fetchRecentActivity). */
export interface FeedRow extends ActivityRow {
  inquiry_id: string
  inquiry: { event_name: string | null; venue: string | null; owner_id: string | null } | null
}

export type FeedItem = { kind: 'row'; row: FeedRow } | { kind: 'sync'; count: number; at: string; oldest: string }

/** Importer rows from one 15-minute run land within seconds of each other; anything further apart is a new run. */
const RUN_GAP_MS = 5 * 60 * 1000

/**
 * Newest-first rows in, feed items out. Rows with a person behind them stay as they are; rows with no actor
 * (the sheet importer) collapse into one "Sheet sync: N changes" item per run so they cannot bury real activity.
 */
export function collapseFeed(rows: FeedRow[]): FeedItem[] {
  const out: FeedItem[] = []
  let run: Extract<FeedItem, { kind: 'sync' }> | null = null
  for (const row of rows) {
    if (row.actor_id) {
      out.push({ kind: 'row', row })
      continue
    }
    if (run && Date.parse(run.oldest) - Date.parse(row.created_at) <= RUN_GAP_MS) {
      run.count += 1
      run.oldest = row.created_at
    } else {
      run = { kind: 'sync', count: 1, at: row.created_at, oldest: row.created_at }
      out.push(run)
    }
  }
  return out
}
