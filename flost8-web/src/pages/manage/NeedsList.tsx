import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Check, ChatCircle, DotsThree } from '@phosphor-icons/react'
import { canEditInquiry } from '../../lib/manage/access'
import { formatDate } from '../../lib/manage/calendar'
import { artistNames, inquiryTitle, SHEET_URLS } from '../../lib/manage/labels'
import { nextStep, waLink, type NeedsActionContext, type Reason } from '../../lib/manage/needsAction'
import type { Artist, Inquiry, Manager } from '../../lib/manage/types'
import { FOCUS_RING, REASON_COLOR } from './styles'

export interface NeedsRow {
  inquiry: Inquiry
  reasons: Reason[]
}

export type AdvanceKind = 'reached_out' | 'paid'


const PILL = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-5 font-grotesk text-[15.5px] font-medium transition active:scale-[0.98] ${FOCUS_RING}`

function Avatars({ slugs, artists }: { slugs: string[]; artists: Artist[] }) {
  return (
    <div className="flex shrink-0 pt-0.5" aria-hidden="true">
      {slugs.slice(0, 2).map((s, n) => (
        <img
          key={s}
          src={`/photos/${s}.webp`}
          alt=""
          width={46}
          height={46}
          loading="lazy"
          title={artists.find((a) => a.slug === s)?.name}
          className={`h-[46px] w-[46px] rounded-full border-2 border-[var(--bg-raise)] bg-[#2a1a36] object-cover [object-position:center_22%] ${n > 0 ? '-ml-3.5' : ''}`}
        />
      ))}
    </div>
  )
}

function MoreMenu({ items }: { items: { label: string; hint?: string; href?: string; external?: boolean; onClick?: () => void }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const row = `flex min-h-[44px] w-full items-center gap-3 whitespace-nowrap rounded-[10px] px-3.5 text-left font-grotesk text-[14.5px] text-[var(--ink-72)] hover:bg-white/5 hover:text-ink ${FOCUS_RING}`
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`grid h-12 w-12 place-items-center rounded-full border border-[var(--bg-line)] text-[var(--ink-72)] hover:bg-[var(--bg-raise)] ${FOCUS_RING}`}
      >
        <DotsThree size={24} weight="bold" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[54px] z-20 min-w-[250px] rounded-[14px] border border-[var(--bg-line)] bg-[#24142F] p-1.5 shadow-[0_12px_36px_rgba(10,4,14,0.7)]">
          {items.map((it) =>
            it.href ? (
              <a
                key={it.label}
                role="menuitem"
                href={it.href}
                {...(it.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                onClick={() => setOpen(false)}
                className={row}
              >
                {it.label}
                {it.hint && <small className="ml-auto whitespace-nowrap text-xs text-[var(--ink-50)]">{it.hint}</small>}
              </a>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  it.onClick?.()
                }}
                className={row}
              >
                {it.label}
                {it.hint && <small className="ml-auto whitespace-nowrap text-xs text-[var(--ink-50)]">{it.hint}</small>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

function NeedsCard({
  row,
  all,
  artists,
  managers,
  me,
  ctx,
  onOpen,
  onChased,
  onAdvance,
}: {
  row: NeedsRow
  all: Inquiry[]
  artists: Artist[]
  managers: Manager[]
  me: Manager
  ctx: NeedsActionContext
  onOpen: (id: string) => void
  onChased: (i: Inquiry) => void
  onAdvance: (i: Inquiry, kind: AdvanceKind) => void
}) {
  const { inquiry: i, reasons } = row
  const primary = reasons[0]
  const color = REASON_COLOR[primary]
  const sheet = i.source === 'sheet_import'
  const ownerName = managers.find((m) => m.id === i.owner_id)?.name
  const sheetUrl = ownerName ? SHEET_URLS[ownerName] : undefined
  const wa = waLink(i.organizer_phone)
  const phone = i.organizer_phone?.replace(/\s/g, '')
  const canEdit = canEditInquiry(i, me)

  const clearsByComment = reasons.includes('no_reply') || reasons.includes('quote_quiet')
  const advance: { kind: AdvanceKind; label: string } | null =
    sheet || !canEdit
      ? null
      : reasons.includes('no_reply') && i.status === 'new'
        ? { kind: 'reached_out', label: 'Mark reached out' }
        : reasons.includes('unpaid_soon') && (i.money?.balance ?? 0) > 0
          ? { kind: 'paid', label: 'Mark paid' }
          : null

  // One big button that matches the flag; WhatsApp is hidden when there is no usable number.
  let button: React.ReactNode = null
  if (primary === 'double_booked')
    button = (
      <button type="button" onClick={() => onOpen(i.id)} className={`${PILL} flex-1 bg-accent text-ink hover:opacity-90 md:flex-none md:px-7`}>
        <ArrowUpRight size={18} aria-hidden="true" />
        Open
      </button>
    )
  else if (primary === 'quote_quiet')
    button = (
      <button type="button" onClick={() => onChased(i)} className={`${PILL} flex-1 border border-[var(--accent-line)] text-ink hover:bg-[var(--accent-soft)] md:flex-none md:px-7`}>
        <Check size={18} weight="bold" aria-hidden="true" />
        Chased today
      </button>
    )
  else if (wa)
    button = (
      <a href={wa} target="_blank" rel="noreferrer noopener" className={`${PILL} flex-1 bg-accent text-ink hover:opacity-90 md:flex-none md:px-7`}>
        <ChatCircle size={18} aria-hidden="true" />
        {primary === 'unpaid_soon' ? 'Chase on WhatsApp' : 'Reply on WhatsApp'}
      </a>
    )

  const menu = [
    ...(phone ? [{ label: `Call ${i.organizer_phone}`, href: `tel:${phone}` }] : []),
    ...(clearsByComment && primary !== 'quote_quiet' ? [{ label: 'Chased today', onClick: () => onChased(i) }] : []),
    ...(advance ? [{ label: advance.label, hint: 'advance status', onClick: () => onAdvance(i, advance.kind) }] : []),
    ...(sheet && sheetUrl ? [{ label: 'Edit in sheet', hint: 'opens workbook', href: sheetUrl, external: true }] : []),
    { label: 'Open details', onClick: () => onOpen(i.id) },
  ]

  return (
    <div className="relative grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1 rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] py-3.5 pl-[18px] pr-3.5 md:grid-cols-[auto_1fr_auto] md:items-center">
      <span aria-hidden="true" className="absolute bottom-3 left-0 top-3 w-1 rounded-r" style={{ backgroundColor: color }} />
      <div className="row-span-3 md:row-span-1">
        <Avatars slugs={i.artists} artists={artists} />
      </div>
      <div className="min-w-0 md:col-start-2">
        <div className="flex flex-wrap items-center gap-2 font-grotesk text-[13px] text-[var(--ink-72)]">
          <span>
            {artistNames(i.artists, artists) || 'No artist yet'} · {formatDate(i.event_date)}
            {i.city ? ` · ${i.city}` : ''}
          </span>
          {sheet && <span className="rounded-full border border-[var(--bg-line)] px-2 py-0.5 text-[11.5px]">From sheet</span>}
          {i.source === 'manual' && <span className="rounded-full border border-[var(--accent-line)] px-2 py-0.5 text-[11.5px] text-[var(--accent-ink)]">Added in app</span>}
          {me.role === 'owner' && ownerName && (
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11.5px] text-[var(--accent-ink)]">{ownerName}</span>
          )}
        </div>
        <p className="font-grotesk text-[17px] font-semibold leading-tight text-ink">{inquiryTitle(i)}</p>
        {reasons.map((r) => (
          <p key={r} className="font-grotesk text-[15px] font-medium" style={{ color: REASON_COLOR[r] }}>
            {nextStep(r, i, ctx, all)}
          </p>
        ))}
      </div>
      <div className="col-span-2 mt-2.5 flex gap-2.5 md:col-span-1 md:col-start-3 md:mt-0">
        {button}
        <MoreMenu items={menu} />
      </div>
    </div>
  )
}

export default function NeedsList({
  rows,
  all,
  artists,
  managers,
  me,
  ctx,
  nextShow,
  onOpen,
  onChased,
  onAdvance,
}: {
  rows: NeedsRow[]
  all: Inquiry[]
  artists: Artist[]
  managers: Manager[]
  me: Manager
  ctx: NeedsActionContext
  nextShow: Inquiry | undefined
  onOpen: (id: string) => void
  onChased: (i: Inquiry) => void
  onAdvance: (i: Inquiry, kind: AdvanceKind) => void
}) {
  const reduce = useReducedMotion()

  if (rows.length === 0)
    return (
      <div className="px-2 py-10 text-center">
        <div aria-hidden="true" className="mx-auto mb-5 grid h-[84px] w-[84px] place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] shadow-[inset_0_0_0_1px_var(--accent-line)]">
          <Check size={38} weight="bold" />
        </div>
        <h2 className="font-display text-4xl leading-none text-ink md:text-5xl">NOTHING NEEDS YOU RIGHT NOW</h2>
        <p className="mt-2 font-grotesk text-[15px] text-[var(--ink-72)]">Everything is answered, paid on time and clash-free.</p>
        {nextShow && (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-[var(--bg-line)] bg-[var(--bg-raise)] p-4 text-left">
            <p className="mb-2 font-grotesk text-xs uppercase tracking-wide text-[var(--ink-50)]">Next booked show</p>
            <p className="font-grotesk text-[17px] font-semibold text-ink">{inquiryTitle(nextShow)}</p>
            <p className="font-grotesk text-[13px] text-[var(--ink-72)]">
              {artistNames(nextShow.artists, artists)} · {formatDate(nextShow.event_date)}
              {nextShow.city ? ` · ${nextShow.city}` : ''}
            </p>
          </div>
        )}
      </div>
    )

  return (
    <ul className="space-y-3">
      <AnimatePresence initial={false}>
        {rows.map((row) => (
          <motion.li
            key={row.inquiry.id}
            layout={!reduce}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: 60, transition: { duration: 0.22 } }}
          >
            <NeedsCard row={row} all={all} artists={artists} managers={managers} me={me} ctx={ctx} onOpen={onOpen} onChased={onChased} onAdvance={onAdvance} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
