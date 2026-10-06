import { MagnifyingGlass } from '@phosphor-icons/react'
import type { Filters, Timeframe } from '../../lib/manage/filters'
import { STATUS_LABEL, STATUS_ORDER } from '../../lib/manage/status'
import type { Artist, Status } from '../../lib/manage/types'
import SelectMenu from './SelectMenu'
import { CHIP_BASE, CHIP_OFF, CHIP_ON, INPUT, LABEL } from './styles'

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: 'all', label: 'All dates' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
]

export default function FilterBar({
  filters,
  onChange,
  artists,
  hideTimeframe,
  noOwnArtists,
  showEveryone,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  artists: Artist[]
  hideTimeframe: boolean
  noOwnArtists: boolean
  showEveryone: boolean
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const toggleStatus = (s: Status) =>
    set({ statuses: filters.statuses.includes(s) ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s] })

  const chip = (on: boolean) => `${CHIP_BASE} ${on ? CHIP_ON : CHIP_OFF}`

  return (
    <section aria-label="Filters" className="mb-5 space-y-4">
      {showEveryone && (
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={filters.scope === 'mine'} className={chip(filters.scope === 'mine')} onClick={() => set({ scope: 'mine' })}>
            My artists
          </button>
          <button type="button" aria-pressed={filters.scope === 'everyone'} className={chip(filters.scope === 'everyone')} onClick={() => set({ scope: 'everyone' })}>
            Everyone&apos;s
          </button>
        </div>
      )}
      {noOwnArtists && filters.scope === 'mine' && (
        <p className="font-grotesk text-sm text-[var(--ink-50)]">No artists are assigned to you yet, so this list is empty.</p>
      )}

      <div className="relative">
        <label htmlFor="m-search" className="sr-only">
          Search by event, venue or organizer
        </label>
        <MagnifyingGlass size={20} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-50)]" />
        <input
          id="m-search"
          type="search"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search event, venue or organizer"
          className={`${INPUT} pl-12`}
          autoComplete="off"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-wrap md:overflow-visible md:px-0" role="group" aria-label="Status">
        <button type="button" aria-pressed={filters.statuses.length === 0} className={chip(filters.statuses.length === 0)} onClick={() => set({ statuses: [] })}>
          All
        </button>
        {STATUS_ORDER.map((s) => (
          <button key={s} type="button" aria-pressed={filters.statuses.includes(s)} className={chip(filters.statuses.includes(s))} onClick={() => toggleStatus(s)}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-end">
        <div>
          <label htmlFor="m-artist" className={LABEL}>
            Artist
          </label>
          <SelectMenu
            id="m-artist"
            value={filters.artist}
            onChange={(artist) => set({ artist })}
            options={[{ value: '', label: 'All artists' }, ...artists.map((a) => ({ value: a.slug, label: a.name }))]}
          />
        </div>
        {!hideTimeframe && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Dates">
            {TIMEFRAMES.map((t) => (
              <button key={t.id} type="button" aria-pressed={filters.timeframe === t.id} className={chip(filters.timeframe === t.id)} onClick={() => set({ timeframe: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
