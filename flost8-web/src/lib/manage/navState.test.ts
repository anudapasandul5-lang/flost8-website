import { describe, it, expect } from 'vitest'
import { DEFAULT_FILTERS } from './filters'
import { loadFilters, loadView, moveHighlight, overlayIsOpen, saveFilters, saveView, shortcutFor, tileTarget, type KeyLike } from './navState'

function fakeStorage(seed: Record<string, string> = {}) {
  const data = { ...seed }
  return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) }
}
const throwing = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('quota')
  },
}

describe('view storage', () => {
  const allowed = ['overview', 'needs', 'all'] as const
  it('round-trips a saved view, per user', () => {
    const s = fakeStorage()
    saveView('u1', 'all', s)
    expect(loadView('u1', allowed, 'overview', s)).toBe('all')
    expect(loadView('u2', allowed, 'overview', s)).toBe('overview')
  })
  it('ignores a view this role cannot open', () => {
    const s = fakeStorage()
    saveView('u1', 'today', s)
    expect(loadView('u1', allowed, 'overview', s)).toBe('overview')
  })
  it('falls back when storage is missing, blocked or corrupt', () => {
    expect(loadView('u1', allowed, 'overview', null)).toBe('overview')
    expect(loadView('u1', allowed, 'overview', throwing)).toBe('overview')
    expect(() => saveView('u1', 'all', throwing)).not.toThrow()
    expect(() => saveView('u1', 'all', null)).not.toThrow()
    const s = fakeStorage({ 'flost8.manage.view.u1': '{not json' })
    expect(loadView('u1', allowed, 'overview', s)).toBe('overview')
  })
})

describe('filter storage', () => {
  it('round-trips filters', () => {
    const s = fakeStorage()
    const f = { scope: 'everyone', statuses: ['quoted', 'deposit_paid'], search: 'neon', timeframe: 'upcoming', artist: 'sonal' } as const
    saveFilters('u1', { ...f, statuses: [...f.statuses] }, s)
    expect(loadFilters('u1', DEFAULT_FILTERS, s)).toEqual(f)
  })
  it('falls back to the defaults on corrupt JSON, wrong shapes or blocked storage', () => {
    for (const raw of ['{nope', 'null', '[]', '"x"', '42']) {
      expect(loadFilters('u1', DEFAULT_FILTERS, fakeStorage({ 'flost8.manage.filters.u1': raw }))).toEqual(DEFAULT_FILTERS)
    }
    expect(loadFilters('u1', DEFAULT_FILTERS, throwing)).toEqual(DEFAULT_FILTERS)
    expect(loadFilters('u1', DEFAULT_FILTERS, null)).toEqual(DEFAULT_FILTERS)
    expect(() => saveFilters('u1', DEFAULT_FILTERS, throwing)).not.toThrow()
  })
  it('keeps the good fields and defaults the bad ones', () => {
    const raw = JSON.stringify({ scope: 'admin', statuses: ['quoted', 'bogus'], search: 7, timeframe: 'past', artist: 'sonal' })
    const got = loadFilters('u1', DEFAULT_FILTERS, fakeStorage({ 'flost8.manage.filters.u1': raw }))
    expect(got).toEqual({ ...DEFAULT_FILTERS, timeframe: 'past', artist: 'sonal' })
  })
  it('caps an absurdly long search', () => {
    const raw = JSON.stringify({ search: 'x'.repeat(5000) })
    expect(loadFilters('u1', DEFAULT_FILTERS, fakeStorage({ 'flost8.manage.filters.u1': raw })).search.length).toBe(200)
  })
})

describe('tileTarget', () => {
  const base = { ...DEFAULT_FILTERS, search: 'old', artist: 'sonal' }
  it('need goes to the follow-ups list (Today for a manager)', () => {
    expect(tileTarget('need', 'owner', base)).toEqual({ view: 'needs' })
    expect(tileTarget('need', 'manager', base)).toEqual({ view: 'today' })
  })
  it('booked and owed show upcoming booked and deposit-paid events, with stale search and artist cleared', () => {
    for (const t of ['booked', 'owed'] as const) {
      const r = tileTarget(t, 'owner', base)
      expect(r.view).toBe('all')
      expect(r.filters).toEqual({ scope: 'everyone', statuses: ['deposit_paid', 'booking_confirmed'], search: '', timeframe: 'upcoming', artist: '' })
    }
    expect(tileTarget('booked', 'manager', base).filters?.scope).toBe('mine')
  })
  it('deposits shows every live upcoming inquiry', () => {
    const r = tileTarget('deposits', 'owner', base)
    expect(r.filters?.statuses).toEqual(['new', 'reached_out', 'quoted', 'tentative', 'deposit_paid', 'booking_confirmed'])
    expect(r.filters?.timeframe).toBe('upcoming')
  })
})

describe('moveHighlight', () => {
  const ids = ['a', 'b', 'c']
  it('starts at the ends and moves one step', () => {
    expect(moveHighlight(ids, null, 'down')).toBe('a')
    expect(moveHighlight(ids, null, 'up')).toBe('c')
    expect(moveHighlight(ids, 'a', 'down')).toBe('b')
    expect(moveHighlight(ids, 'b', 'up')).toBe('a')
  })
  it('stops at the ends and recovers from an id that left the list', () => {
    expect(moveHighlight(ids, 'c', 'down')).toBe('c')
    expect(moveHighlight(ids, 'a', 'up')).toBe('a')
    expect(moveHighlight(ids, 'gone', 'down')).toBe('a')
    expect(moveHighlight([], null, 'down')).toBeNull()
  })
})

describe('shortcutFor', () => {
  const key = (k: string, over: Partial<KeyLike> = {}): KeyLike => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, target: document.body, ...over })
  const el = (html: string) => {
    document.body.innerHTML = html
    return document.body.firstElementChild as HTMLElement
  }

  it('maps the plain keys', () => {
    expect(shortcutFor(key('/'), false)).toBe('search')
    expect(shortcutFor(key('n'), false)).toBe('add')
    expect(shortcutFor(key('N'), false)).toBe('add')
    expect(shortcutFor(key('ArrowDown'), false)).toBe('down')
    expect(shortcutFor(key('ArrowUp'), false)).toBe('up')
    expect(shortcutFor(key('Enter'), false)).toBeNull()
    expect(shortcutFor(key('x'), false)).toBeNull()
  })
  it('ignores everything while typing', () => {
    for (const html of ['<input />', '<textarea></textarea>', '<select></select>', '<div contenteditable="true"><b id="in">x</b></div>', '<div contenteditable=""></div>']) {
      const root = el(html)
      const target = root.querySelector('#in') ?? root
      for (const k of ['/', 'n', 'ArrowDown', 'ArrowUp']) expect(shortcutFor(key(k, { target }), false)).toBeNull()
    }
  })
  it('ignores everything while a dialog, menu or drawer is open', () => {
    for (const k of ['/', 'n', 'ArrowDown', 'ArrowUp']) expect(shortcutFor(key(k), true)).toBeNull()
  })
  it('ignores browser shortcuts (ctrl, meta, alt)', () => {
    for (const mod of ['ctrlKey', 'metaKey', 'altKey'] as const) for (const k of ['/', 'n', 'ArrowDown', 'ArrowUp']) expect(shortcutFor(key(k, { [mod]: true }), false)).toBeNull()
  })
  it('leaves Enter alone and arrows to an open-able menu button', () => {
    expect(shortcutFor(key('Enter', { target: el('<button>x</button>') }), false)).toBeNull()
    expect(shortcutFor(key('ArrowDown', { target: el('<button>x</button>') }), false)).toBe('down')
    expect(shortcutFor(key('ArrowDown', { target: el('<button aria-haspopup="listbox">x</button>') }), false)).toBeNull()
    expect(shortcutFor(key('n', { target: el('<button>x</button>') }), false)).toBe('add')
  })
  it('ignores composing and already-handled keys', () => {
    expect(shortcutFor(key('n', { isComposing: true }), false)).toBeNull()
    expect(shortcutFor(key('n', { defaultPrevented: true }), false)).toBeNull()
  })
})

describe('overlayIsOpen', () => {
  it('spots dialogs, menus, listboxes and expanded popup buttons', () => {
    document.body.innerHTML = '<main><button>ok</button></main>'
    expect(overlayIsOpen(document)).toBe(false)
    for (const html of ['<div role="dialog"></div>', '<div role="alertdialog"></div>', '<div aria-modal="true"></div>', '<div role="menu"></div>', '<ul role="listbox"></ul>', '<button aria-haspopup="menu" aria-expanded="true"></button>']) {
      document.body.innerHTML = html
      expect(overlayIsOpen(document)).toBe(true)
    }
    document.body.innerHTML = '<button aria-haspopup="menu" aria-expanded="false"></button>'
    expect(overlayIsOpen(document)).toBe(false)
  })
})
