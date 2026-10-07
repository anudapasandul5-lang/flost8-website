import { useMemo, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, Check, ChatCircle } from '@phosphor-icons/react'
import { formatDate } from '../../lib/manage/calendar'
import { artistNames, inquiryTitle } from '../../lib/manage/labels'
import { formatAmount } from '../../lib/manage/money'
import { snoozedLabel } from '../../lib/manage/snooze'
import { nextStep, REASON_RANK, waLink, type NeedsActionContext, type Reason } from '../../lib/manage/needsAction'
import { moneyByMonth, pipeline, tiles } from '../../lib/manage/overview'
import { STATUS_LABEL } from '../../lib/manage/status'
import type { Artist, Inquiry, Manager, Status } from '../../lib/manage/types'
import AreaChart from './AreaChart'
import Donut from './Donut'
import type { NeedsRow } from './NeedsList'
import { FOCUS_RING, PANEL, REASON_COLOR } from './styles'

export type OverviewTile = 'need' | 'booked' | 'owed' | 'deposits'

export interface OverviewViewProps {
  /** Everything the viewer may see. Rows outside `managerFilter` are dropped here. */
  inquiries: Inquiry[]
  /** Rows with an open flag, most urgent first (the same list the Needs you view uses). */
  waiting: NeedsRow[]
  /** Owner only: rows hidden by a snooze, shown dimmed under the open ones. */
  snoozed?: NeedsRow[]
  /** Local date, YYYY-MM-DD. */
  today: string
  /** Owner sees "Team follow-ups" with a With column; a manager sees "Needs you" with action buttons. */
  role: Manager['role']
  /** Owner's manager filter (a manager id), or null for everyone. */
  managerFilter: string | null
  managers: Manager[]
  artists: Artist[]
  me: Manager
  /** Needed by nextStep() for the wording of each line. */
  ctx: NeedsActionContext
  onOpen: (id: string) => void
  /** "Chased today" on a quiet quote. */
  onChased: (i: Inquiry) => void
  /** "View all" under the top 4. */
  onViewAll: () => void
  /** Makes the four tiles clickable; omit for plain tiles. */
  onTile?: (tile: OverviewTile) => void
}

const TOP_ROWS = 4

const REASON_LABEL: Record<Reason, (n: number) => string> = {
  double_booked: (n) => (n === 1 ? 'clash' : 'clashes'),
  unpaid_soon: () => 'unpaid soon',
  no_reply: () => 'to reply',
  quote_quiet: (n) => (n === 1 ? 'quote quiet' : 'quotes quiet'),
}

const STATUS_DOT: Record<Exclude<Status, 'spam'>, string> = {
  new: '#E9D5FF',
  reached_out: '#C88BFF',
  quoted: '#A855F7',
  tentative: '#FDBA74',
  deposit_paid: '#9D14FF',
  booking_confirmed: '#6EE7B7',
  lost: 'rgba(255,255,255,.3)',
}

const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M` : num.format(n))
const dayMonth = (iso: string | null) => formatDate(iso).replace(/ \d{4}$/, '')

function Tile({
  label,
  hot,
  onClick,
  children,
  gauge,
}: {
  label: string
  /** Urgency colour that tints the card, or undefined. */
  hot?: string
  onClick?: () => void
  children: ReactNode
  gauge?: ReactNode
}) {
  const style = hot ? { borderColor: `color-mix(in srgb, ${hot} 35%, transparent)`, backgroundImage: `linear-gradient(160deg, color-mix(in srgb, ${hot} 14%, transparent), transparent 60%)` } : undefined
  const cls = `relative block w-full rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] p-4 text-left ${onClick ? `transition hover:border-[var(--accent-line)] active:scale-[0.99] ${FOCUS_RING}` : ''}`
  const body = (
    <>
      <span className="block font-grotesk text-[13px] text-[var(--ink-72)]">{label}</span>
      {children}
      {gauge}
      {onClick && <ArrowRight size={14} aria-hidden="true" className="absolute right-3.5 top-3.5 text-[var(--ink-32)]" />}
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {body}
    </button>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  )
}

const VALUE = 'my-1.5 block font-grotesk text-[24px] font-semibold leading-tight tracking-tight tabular-nums text-ink min-[1400px]:text-[30px]'
const SUB = 'block font-grotesk text-[12.5px] leading-snug text-[var(--ink-50)]'

function Gauge({ pct }: { pct: number | null }) {
  return (
    <svg width="64" height="36" viewBox="0 0 64 36" aria-hidden="true" className="absolute right-3.5 top-12 hidden md:block">
      <path d="M6 32a26 26 0 0 1 52 0" pathLength="100" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" strokeLinecap="round" />
      {pct !== null && pct > 0 && (
        <path d="M6 32a26 26 0 0 1 52 0" pathLength="100" fill="none" stroke="#9D14FF" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${Math.min(100, pct)} 100`} />
      )}
    </svg>
  )
}

function Tiles({ props, filtered, waiting }: { props: OverviewViewProps; filtered: Inquiry[]; waiting: NeedsRow[] }) {
  const { today, role, onTile } = props
  const t = useMemo(() => tiles(filtered, waiting, today), [filtered, waiting, today])
  const click = (k: OverviewTile) => (onTile ? () => onTile(k) : undefined)

  const reasons = (Object.keys(REASON_RANK) as Reason[]).sort((a, b) => REASON_RANK[a] - REASON_RANK[b]).filter((r) => t.need.byReason[r] > 0)
  const manyCurrencies = t.owed.length > 1
  const next = t.booked.next

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Tile label={role === 'owner' ? 'Team follow-ups' : 'Needs you'} hot={t.need.top ? REASON_COLOR[t.need.top] : undefined} onClick={click('need')}>
        <span className={VALUE}>{t.need.count}</span>
        <span className={SUB}>
          {reasons.length === 0
            ? 'All clear'
            : reasons.map((r, k) => (
                <span key={r}>
                  {k > 0 && ' · '}
                  <span className="whitespace-nowrap" style={{ color: REASON_COLOR[r], fontWeight: 500 }}>
                    {t.need.byReason[r]} {REASON_LABEL[r](t.need.byReason[r])}
                  </span>
                </span>
              ))}
        </span>
      </Tile>

      <Tile label="Booked ahead" onClick={click('booked')}>
        <span className={VALUE}>
          {t.booked.count} <span className="text-[15px] font-normal text-[var(--ink-50)]">{t.booked.count === 1 ? 'show' : 'shows'}</span>
        </span>
        <span className={SUB}>
          {next ? (
            <>
              Next: <b className="font-medium text-ink">{inquiryTitle(next)}, {dayMonth(next.event_date)}</b>
            </>
          ) : (
            'Nothing booked ahead'
          )}
        </span>
      </Tile>

      <Tile label={manyCurrencies ? 'Still owed' : `Still owed${t.owed[0] ? ` (${t.owed[0].currency})` : ''}`} onClick={click('owed')}>
        {t.owed.length === 0 ? (
          <span className={VALUE}>-</span>
        ) : (
          t.owed.map((o) => (
            <span key={o.currency} className={VALUE}>
              {num.format(o.amount)}
              {manyCurrencies && <span className="ml-1.5 text-[13px] font-normal text-[var(--ink-50)]">{o.currency}</span>}
            </span>
          ))
        )}
        <span className={SUB}>
          {t.owed.some((o) => o.dueSoon > 0)
            ? t.owed
                .filter((o) => o.dueSoon > 0)
                .map((o, k) => (
                  <span key={o.currency}>
                    {k > 0 && ' · '}
                    <b className="font-medium" style={{ color: REASON_COLOR.unpaid_soon }}>
                      {num.format(o.dueSoon)}
                      {manyCurrencies && ` ${o.currency}`}
                    </b>{' '}
                    due this week
                  </span>
                ))
            : t.owed.length === 0
              ? 'No balance owed'
              : 'Nothing due this week'}
        </span>
      </Tile>

      <Tile label="Deposits collected" onClick={click('deposits')} gauge={<Gauge pct={t.deposits[0]?.pct ?? null} />}>
        <span className={VALUE}>
          {t.deposits[0]?.pct == null ? '-' : `${t.deposits[0].pct}%`}
          {t.deposits.length > 1 && t.deposits[0]?.pct != null && <span className="ml-1.5 text-[13px] font-normal text-[var(--ink-50)]">{t.deposits[0].currency}</span>}
        </span>
        <span className={SUB}>
          {t.deposits.length === 0
            ? 'Nothing quoted yet'
            : t.deposits.map((d) => (
                <span key={d.currency} className="block">
                  {t.deposits.length > 1 && `${d.currency} `}
                  {short(d.collected)} of {short(d.quoted)} quoted
                </span>
              ))}
        </span>
      </Tile>
    </div>
  )
}

function Charts({ filtered, today, owner }: { filtered: Inquiry[]; today: string; owner: boolean }) {
  const pipe = useMemo(() => pipeline(filtered), [filtered])
  const money = useMemo(() => moneyByMonth(filtered, today), [filtered, today])
  const anyMoney = money.months.some((m) => m.quoted > 0 || m.deposits > 0)

  return (
    <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
      <section aria-labelledby="ov-pipeline" className={`${PANEL} flex flex-col p-4`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="ov-pipeline" className="font-grotesk text-base font-medium text-ink">Pipeline</h2>
          <span className="font-grotesk text-[12.5px] text-[var(--ink-50)]">{pipe.total} inquiries</span>
        </div>
        <div className="my-auto flex flex-wrap items-center gap-x-5 gap-y-4 min-[420px]:flex-nowrap">
          <div className="mx-auto shrink-0 min-[420px]:mx-0">
            <Donut
              size={150}
              caption="Inquiries by status"
              centerValue={pipe.bookedPct === null ? '-' : `${pipe.bookedPct}%`}
              centerLabel="booked"
              segments={pipe.stages.map((s) => ({ label: STATUS_LABEL[s.status], value: s.count, color: STATUS_DOT[s.status as Exclude<Status, 'spam'>] }))}
            />
          </div>
          <ul className="m-0 grid min-w-0 flex-1 list-none grid-cols-1 gap-x-3.5 gap-y-2.5 p-0 min-[1400px]:grid-cols-2 min-[1400px]:gap-y-3">
            {pipe.stages.map((s) => (
              <li key={s.status} className="flex items-baseline justify-between gap-2 font-grotesk text-[12.5px] text-[var(--ink-72)] min-[1400px]:block">
                <span>
                  <i aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: STATUS_DOT[s.status as Exclude<Status, 'spam'>] }} />
                  {STATUS_LABEL[s.status]}
                </span>
                <b className="text-[15px] font-medium tabular-nums text-ink min-[1400px]:mt-0.5 min-[1400px]:block min-[1400px]:text-[18px]">{s.count}</b>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="ov-money" className={`${PANEL} p-4`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 id="ov-money" className="font-grotesk text-base font-medium text-ink">Money by event month</h2>
          <span className="flex items-center gap-3 font-grotesk text-[12.5px] text-[var(--ink-50)]">
            LKR
            <span className="inline-flex items-center gap-1.5">
              <i aria-hidden="true" className="inline-block w-4 border-t-2 border-dashed border-white/40" />
              Quoted
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i aria-hidden="true" className="inline-block h-0.5 w-4 rounded bg-[#C88BFF]" />
              Deposits
            </span>
          </span>
        </div>
        {anyMoney ? (
          <AreaChart
            caption="Quoted fees and deposits by event month, LKR"
            labels={money.months.map((m) => m.label)}
            format={(n) => formatAmount(n, 'LKR')}
            series={[
              { name: 'Quoted', values: money.months.map((m) => m.quoted), color: 'rgba(255,255,255,.35)', dashed: true },
              { name: 'Deposits', values: money.months.map((m) => m.deposits), color: '#C88BFF', fill: true },
            ]}
          />
        ) : (
          <p className="grid min-h-[170px] place-items-center text-center font-grotesk text-[14px] text-[var(--ink-50)]">No LKR money recorded for these months yet.</p>
        )}
        {(money.skipped > 0 || money.otherCurrency > 0) && (
          <p className="mt-2 font-grotesk text-[12px] text-[var(--ink-50)]">
            {[
              money.skipped > 0 && `${money.skipped} ${money.skipped === 1 ? 'show has' : 'shows have'} ${owner ? 'no money recorded' : 'no money you can see'}`,
              money.otherCurrency > 0 && `${money.otherCurrency} priced in another currency, not shown`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </section>
    </div>
  )
}

const ROW_COLS = 'md:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)_88px_minmax(0,2fr)_minmax(88px,auto)]'

function FollowUps({ props, rows, snoozed }: { props: OverviewViewProps; rows: NeedsRow[]; snoozed: NeedsRow[] }) {
  const { role, managers, artists, ctx, inquiries, today, onOpen, onChased, onViewAll } = props
  const owner = role === 'owner'
  const top = rows.slice(0, TOP_ROWS)
  const title = owner ? 'Team follow-ups' : 'Needs you'

  return (
    <section aria-labelledby="ov-needs" className={`${PANEL} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="ov-needs" className="font-grotesk text-base font-medium text-ink">{title}</h2>
        <span className="font-grotesk text-[12.5px] text-[var(--ink-50)]">
          <span className="hidden sm:inline">{rows.length > 0 && 'Most urgent first · '}</span>
          {rows.length > 0 && (
            <button type="button" onClick={onViewAll} className={`inline-flex min-h-[44px] items-center text-[var(--accent-ink)] hover:underline ${FOCUS_RING}`}>
              View all {rows.length} <ArrowRight size={13} aria-hidden="true" className="ml-1" />
            </button>
          )}
        </span>
      </div>

      {top.length === 0 ? (
        <p className="flex items-center gap-2.5 py-3 font-grotesk text-[14.5px] text-[var(--ink-72)]">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
            <Check size={16} weight="bold" />
          </span>
          Nothing needs {owner ? 'follow-up' : 'you'} right now.
        </p>
      ) : (
        <>
          <div aria-hidden="true" className={`hidden gap-3 border-b border-[var(--bg-line)] px-3 pb-2.5 font-grotesk text-xs font-medium text-[var(--ink-50)] md:grid ${ROW_COLS}`}>
            <span>Event</span>
            <span>Artist</span>
            <span>Date</span>
            <span>Next step</span>
            <span>{owner ? 'With' : ''}</span>
          </div>
          <ul className="m-0 list-none p-0">
            {top.map(({ inquiry: i, reasons }) => {
              const primary = reasons[0]
              const color = REASON_COLOR[primary]
              const sheet = i.source === 'sheet_import'
              const withName = managers.find((m) => m.id === i.owner_id)?.name
              const wa = waLink(i.organizer_phone)
              const names = artistNames(i.artists, artists) || 'No artist yet'
              const more = reasons.length - 1

              let action: ReactNode = null
              const pill = `inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 font-grotesk text-[13.5px] font-medium transition active:scale-[0.98] ${FOCUS_RING}`
              if (primary === 'double_booked')
                action = (
                  <button type="button" onClick={() => onOpen(i.id)} className={`${pill} bg-accent text-ink hover:opacity-90`}>
                    <ArrowUpRight size={16} aria-hidden="true" />
                    Open
                  </button>
                )
              else if (primary === 'quote_quiet')
                action = (
                  <button type="button" onClick={() => onChased(i)} className={`${pill} border border-[var(--accent-line)] text-ink hover:bg-[var(--accent-soft)]`}>
                    <Check size={16} weight="bold" aria-hidden="true" />
                    Chased today
                  </button>
                )
              else if (wa)
                action = (
                  <a href={wa} target="_blank" rel="noreferrer noopener" aria-label={primary === 'unpaid_soon' ? 'Chase on WhatsApp' : 'Reply on WhatsApp'} className={`${pill} bg-accent text-ink hover:opacity-90`}>
                    <ChatCircle size={16} aria-hidden="true" />
                    {primary === 'unpaid_soon' ? 'Chase' : 'Reply'}
                  </a>
                )

              return (
                <li key={i.id} className={`relative grid gap-x-3 gap-y-0.5 border-b border-[var(--bg-line)] py-3 pl-4 pr-1 last:border-b-0 md:items-center md:px-3 ${ROW_COLS}`}>
                  <span aria-hidden="true" className="absolute bottom-3 left-0 top-3 w-1 rounded-r md:left-0" style={{ backgroundColor: color }} />
                  <div className="min-w-0">
                    <button type="button" onClick={() => onOpen(i.id)} className={`block max-w-full truncate rounded text-left font-grotesk text-[15px] font-medium text-ink hover:underline ${FOCUS_RING}`}>
                      {inquiryTitle(i)}
                    </button>
                    <small className="block truncate font-grotesk text-xs text-[var(--ink-50)]">
                      <span className="md:hidden">{names} · {dayMonth(i.event_date)} · </span>
                      {i.city ?? 'No city'}{sheet ? ' · From sheet' : ''}
                    </small>
                  </div>
                  <span className="hidden truncate font-grotesk text-[14px] text-[var(--ink-72)] md:block">{names}</span>
                  <span className="hidden font-grotesk text-[14px] tabular-nums text-[var(--ink-72)] md:block">{dayMonth(i.event_date)}</span>
                  <span className="font-grotesk text-[14px] font-medium" style={{ color }}>
                    {nextStep(primary, i, ctx, inquiries)}
                    {more > 0 && <small className="ml-1.5 whitespace-nowrap font-normal text-[var(--ink-50)]">+{more} more</small>}
                  </span>
                  <div className="mt-1.5 md:mt-0">
                    {owner ? (
                      withName && <span className="inline-block rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-grotesk text-[11.5px] text-[var(--accent-ink)]">{withName}</span>
                    ) : (
                      action
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {owner && snoozed.length > 0 && (
        <ul aria-label="Snoozed" className="m-0 mt-2 list-none border-t border-[var(--bg-line)] p-0 pt-1 opacity-60">
          {snoozed.slice(0, TOP_ROWS).map(({ inquiry: i }) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2 pl-4 pr-1">
              <div className="min-w-0">
                <button type="button" onClick={() => onOpen(i.id)} className={`block max-w-full truncate rounded text-left font-grotesk text-[14.5px] text-ink hover:underline ${FOCUS_RING}`}>
                  {inquiryTitle(i)}
                </button>
                <small className="block font-grotesk text-xs text-[var(--ink-72)]">{snoozedLabel(i.snoozed_until!, today)}</small>
              </div>
              {managers.find((m) => m.id === i.owner_id)?.name && (
                <span className="inline-block rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-grotesk text-[11.5px] text-[var(--accent-ink)]">{managers.find((m) => m.id === i.owner_id)?.name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Main column of the Overview: tiles, pipeline + money charts, and the top rows of Needs you /
 * Team follow-ups. DOM order is the phone order (tiles, follow-ups, charts); from lg the charts
 * move above the follow-ups. Right-column content (next shows, activity, managers) lives elsewhere.
 */
export default function OverviewView(props: OverviewViewProps) {
  const { inquiries, waiting, managerFilter, snoozed = [] } = props
  const filtered = useMemo(() => (managerFilter ? inquiries.filter((i) => i.owner_id === managerFilter) : inquiries), [inquiries, managerFilter])
  const rows = useMemo(() => (managerFilter ? waiting.filter((r) => r.inquiry.owner_id === managerFilter) : waiting), [waiting, managerFilter])

  const snoozedRows = useMemo(() => (managerFilter ? snoozed.filter((r) => r.inquiry.owner_id === managerFilter) : snoozed), [snoozed, managerFilter])

  return (
    <div className="flex flex-col gap-3">
      <Tiles props={props} filtered={filtered} waiting={rows} />
      <div className="lg:order-last">
        <FollowUps props={props} rows={rows} snoozed={snoozedRows} />
      </div>
      <Charts filtered={filtered} today={props.today} owner={props.role === 'owner'} />
    </div>
  )
}
