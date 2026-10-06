import { artistNames, inquiryTitle } from '../../lib/manage/labels'
import { upcomingBooked } from '../../lib/manage/needsAction'
import type { Artist, Inquiry } from '../../lib/manage/types'
import { FOCUS_RING, REASON_COLOR } from './styles'

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** The next 3 booked or deposit-paid shows. `list` is already limited to what the viewer should see. */
export default function NextShows({
  list,
  today,
  artists,
  conflicts,
  onOpen,
}: {
  list: Inquiry[]
  today: string
  artists: Artist[]
  conflicts: ReadonlySet<string>
  onOpen: (id: string) => void
}) {
  const shows = upcomingBooked(list, today).slice(0, 3)
  return (
    <section aria-labelledby="next-shows-h">
      <h3 id="next-shows-h" className="mb-3 font-grotesk text-[16px] font-medium text-ink">
        Next shows
      </h3>
      {shows.length === 0 ? (
        <p className="font-grotesk text-sm text-[var(--ink-50)]">No shows booked ahead.</p>
      ) : (
        <ul className="space-y-2.5">
          {shows.map((s) => {
            const [, m, d] = s.event_date!.split('-').map(Number)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onOpen(s.id)}
                  className={`grid min-h-[48px] w-full grid-cols-[44px_1fr] items-center gap-3 rounded-xl text-left ${FOCUS_RING}`}
                >
                  <span className="grid h-11 place-items-center rounded-xl border border-[var(--bg-line)] bg-[var(--bg-raise)] text-center leading-none" aria-hidden="true">
                    <span>
                      <b className="block font-display text-[20px] font-normal text-ink">{String(d).padStart(2, '0')}</b>
                      <small className="text-[10px] text-[var(--ink-50)]">{MON[m - 1]}</small>
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-grotesk text-[14.5px] font-medium text-ink">{inquiryTitle(s)}</span>
                    <span className="block truncate font-grotesk text-[12.5px] text-[var(--ink-50)]">
                      {artistNames(s.artists, artists)}
                      {s.city ? ` · ${s.city}` : ''}
                      {conflicts.has(s.id) && <b className="font-medium" style={{ color: REASON_COLOR.double_booked }}> · clash</b>}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
