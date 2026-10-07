import type { Filters, Scope, Timeframe } from './filters'
import { STATUS_ORDER } from './status'
import type { Manager, Status } from './types'

// Remembered view and filters, tile shortcuts, and the keyboard-shortcut guard. Pure and DOM-light so it can be tested.

export interface StorageLike {
  getItem: (k: string) => string | null
  setItem: (k: string, v: string) => void
}

/** localStorage, or null when the browser blocks it (reading the property itself can throw). */
function browserStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function read(key: string, storage: StorageLike | null | undefined): unknown {
  try {
    const s = storage === undefined ? browserStorage() : storage
    const raw = s?.getItem(key)
    return raw == null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

function write(key: string, value: unknown, storage: StorageLike | null | undefined): void {
  try {
    const s = storage === undefined ? browserStorage() : storage
    s?.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the page works the same, it just forgets next time.
  }
}

// Keyed per person so two managers sharing a browser do not inherit each other's view.
const viewKey = (userId: string) => `flost8.manage.view.${userId}`
const filtersKey = (userId: string) => `flost8.manage.filters.${userId}`

export function loadView<V extends string>(userId: string, allowed: readonly V[], fallback: V, storage?: StorageLike | null): V {
  const v = read(viewKey(userId), storage)
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as V) : fallback
}

export function saveView(userId: string, view: string, storage?: StorageLike | null): void {
  write(viewKey(userId), view, storage)
}

const SCOPES: Scope[] = ['mine', 'everyone']
const TIMEFRAMES: Timeframe[] = ['all', 'upcoming', 'past']
const MAX_SEARCH = 200

/** Each stored field is checked on its own; a bad or missing one takes the fallback's value. */
export function loadFilters(userId: string, fallback: Filters, storage?: StorageLike | null): Filters {
  const v = read(filtersKey(userId), storage)
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return fallback
  const o = v as Record<string, unknown>
  return {
    scope: SCOPES.includes(o.scope as Scope) ? (o.scope as Scope) : fallback.scope,
    statuses: Array.isArray(o.statuses) && o.statuses.every((s) => STATUS_ORDER.includes(s as Status)) ? (o.statuses as Status[]) : fallback.statuses,
    search: typeof o.search === 'string' ? o.search.slice(0, MAX_SEARCH) : fallback.search,
    timeframe: TIMEFRAMES.includes(o.timeframe as Timeframe) ? (o.timeframe as Timeframe) : fallback.timeframe,
    artist: typeof o.artist === 'string' ? o.artist : fallback.artist,
  }
}

export function saveFilters(userId: string, filters: Filters, storage?: StorageLike | null): void {
  write(filtersKey(userId), filters, storage)
}

// --- Overview tiles ---

export type TileId = 'need' | 'booked' | 'owed' | 'deposits'

const BOOKED: Status[] = ['deposit_paid', 'booking_confirmed']
const LIVE: Status[] = STATUS_ORDER.filter((s) => s !== 'lost' && s !== 'spam')

/**
 * Where a tile leads. There is no "has a balance" filter, so Booked ahead and Still owed both open
 * upcoming booked + deposit-paid events (the exact set the owed figure adds up); Deposits opens upcoming live inquiries.
 */
export function tileTarget(tile: TileId, role: Manager['role'], base: Filters): { view: 'needs' | 'today' | 'all'; filters?: Filters } {
  if (tile === 'need') return { view: role === 'owner' ? 'needs' : 'today' }
  return {
    view: 'all',
    filters: { ...base, scope: role === 'owner' ? 'everyone' : 'mine', statuses: tile === 'deposits' ? LIVE : BOOKED, search: '', timeframe: 'upcoming', artist: '' },
  }
}

// --- Keyboard shortcuts ---

export type Shortcut = 'search' | 'add' | 'up' | 'down'

/** The bits of a KeyboardEvent the guard reads. */
export interface KeyLike {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  isComposing?: boolean
  defaultPrevented?: boolean
  target: EventTarget | null
}

const closest = (t: EventTarget | null, sel: string) => (t instanceof Element ? t.closest(sel) : null)

const TYPING = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
const OVERLAY = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], [role="menu"], [role="listbox"], [aria-haspopup][aria-expanded="true"]'

/** True while a dialog, drawer, menu or dropdown is showing. */
export function overlayIsOpen(root: ParentNode): boolean {
  return root.querySelector(OVERLAY) !== null
}

/**
 * Which shortcut a key press means, or null to leave it alone. Never fires while typing, with ctrl/meta/alt held,
 * or while something is open on top. Arrows move focus between list rows, so Enter then opens the focused row
 * natively; there is deliberately no Enter shortcut to double-fire on a focused button.
 */
export function shortcutFor(e: KeyLike, overlayOpen: boolean): Shortcut | null {
  if (overlayOpen || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.defaultPrevented) return null
  if (closest(e.target, TYPING)) return null
  switch (e.key) {
    case '/':
      return 'search'
    case 'n':
    case 'N':
      return 'add'
    case 'ArrowDown':
    case 'ArrowUp':
      // A menu button owns its own arrow keys.
      return closest(e.target, '[aria-haspopup]') ? null : e.key === 'ArrowDown' ? 'down' : 'up'
    default:
      return null
  }
}

/** Next id one step up or down; stops at the ends. No current (or an unknown one) starts from the top, or the bottom going up. */
export function moveHighlight(ids: readonly string[], current: string | null, dir: 'up' | 'down'): string | null {
  if (ids.length === 0) return null
  const at = current === null ? -1 : ids.indexOf(current)
  if (at === -1) return dir === 'down' ? ids[0] : ids[ids.length - 1]
  return ids[Math.min(ids.length - 1, Math.max(0, at + (dir === 'down' ? 1 : -1)))]
}
