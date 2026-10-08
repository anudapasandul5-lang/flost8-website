// Run: node apps-script/sync.test.cjs   (no deps). Loads sync.gs as-is and checks the pure logic.
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path')
const ctx = {}
vm.createContext(ctx)
vm.runInContext(fs.readFileSync(path.join(__dirname, 'sync.gs'), 'utf8'), ctx)

const H = ['Row ID', 'Deleted', 'Artist', 'Event Date', 'Event Name', 'Venue / Page Name', 'Balance (LKR)', 'Notes', 'Status']
const row = (artist, date, event, place, status = 'Booking Confirmed', balance = '') =>
  ['x', false, artist, date, event, place, balance, '', status]
const hdr = (m) => ['', false, '', m, '', '', '', '', '']
const TODAY = '2026-10-06'
const build = (tabs) => ctx.fsync_build_(tabs, TODAY)

// date parsing: the sheet's month/day swap is fixed from the month header, wrong years are refused
assert.deepStrictEqual({ ...ctx.fsync_parseDate_('D:2026-03-07', 7, 2026) }, { date: '2026-07-03', swapped: true })
assert.strictEqual(ctx.fsync_parseDate_('D:2026-10-11', 10, 2026).date, '2026-10-11')
assert.strictEqual(ctx.fsync_parseDate_('13/11/2026', 11, 2026).date, '2026-11-13')
assert.strictEqual(ctx.fsync_parseDate_('8.8.2026', null, null).date, '2026-08-08')
assert.ok(ctx.fsync_parseDate_('13/11/2025', 11, 2026).error)
assert.ok(ctx.fsync_parseDate_('TBC', 11, 2026).error)
assert.ok(ctx.fsync_parseDate_('D:2026-05-12', 12, 2026).error === undefined) // 5 Dec, swapped
assert.ok(ctx.fsync_parseDate_('D:2026-02-30', null, null).error)

// price tags never reach the public site
assert.strictEqual(ctx.fsync_cleanEvent_('Zultan Festival 2026 - 200K'), 'Zultan Festival 2026')
assert.strictEqual(ctx.fsync_cleanEvent_("Brew Island - Sahan's - 150K"), "Brew Island - Sahan's")

// end to end on traps taken from the real sheets
const sonal = [H, hdr('OCTOBER'),
  row('Sonal', 'D:2026-10-12', 'Ritual of Soul', 'Colombo'),
  hdr('NOVEMBER'),
  row('Sonal', '13/11/2026', 'Limmina', 'Other Room Colombo'),
  row('Sonal', '21/11/2026', 'Illusya', 'Colombo'),
  row('Sonal', '28/11/2027', 'Future typo', 'Colombo'),            // wrong year -> issue
  row('Sonal', '29/11/2026', 'TBA', 'TBA')]                          // no name -> issue
const maalin = [H, hdr('NOVEMBER'),
  row('Maalin', '13/11/2026', 'Limina', 'Other Room Colombo'),
  row('Maalin', '14/11/2026', 'Moved', 'Colombo', 'Booking Confirmed', 'POSTPONED'),
  row('Maalin', '15/11/2026', 'Not yet', 'Colombo', 'Reached Out')]
const drg = [H, hdr('JULY'),
  row('Dr Green', 'D:2026-03-07', 'DISTRKT', 'Tashan'),             // past -> dropped
  hdr('OCTOBER'),
  row('Dr Green', 'D:2026-10-09', 'Dark Falls', 'Ratnapura'),
  row('Dr Green', '17/10/2026', 'Wild Air 1.0 - 150K', 'Parkstreet Warehouse'),
  row('Dr Green', '24/10/2026', '', 'Colombo'),                      // no event name -> issue
  hdr('NOVEMBER'),
  row('Dr Green', 'D:2026-11-14', 'Talimuss Main Event', '')]        // no location -> issue

const r = build([{ name: 'Sonal', values: sonal }, { name: 'Maalin', values: maalin }, { name: 'Dr Green', values: drg }])
const line = (s) => `${s.date} ${s.artist_display} | ${s.venue} @ ${s.city}`
assert.deepStrictEqual(Array.from(r.shows.map(line)), [
  '2026-10-09 DR. GREEN | Dark Falls @ Ratnapura',
  '2026-10-12 SONAL | Ritual of Soul @ Colombo',
  '2026-10-17 DR. GREEN | Wild Air 1.0 @ Parkstreet Warehouse',
  '2026-11-13 SONAL B2B MAALIN | Limmina @ Other Room Colombo',   // merged across spellings
  '2026-11-21 SONAL | Illusya @ Colombo'])
assert.strictEqual(r.shows[3].artist, 'sonal')
assert.strictEqual(r.issues.length, 4)
assert.ok(r.issues.some((x) => /year 2027/.test(x.problem)))
assert.ok(!JSON.stringify(r.shows).includes('150'))                // no fee leakage

// diff: only sync: rows are ever touched; ticket_link/time are not compared
const d = ctx.fsync_diff_(r.shows, [
  { id: 'hand-added-uuid', date: '2026-11-07', venue: 'TBA', city: 'Unawatuna', artist: 'dr-green', artist_display: 'DR. GREEN' },
  { ...r.shows[0] },                                                // unchanged
  { ...r.shows[1], venue: 'Old name' },                             // changed
  { id: 'sync:2026-09-01|gone', date: '2026-09-01', venue: 'Gone', city: 'x', artist: 'sonal', artist_display: 'SONAL' }])
assert.deepStrictEqual([d.add.length, d.update.length, d.remove.length], [3, 1, 1])
assert.strictEqual(d.remove[0].id, 'sync:2026-09-01|gone')

// a synced row stored as a real Date cell must be rewritten as text, even when the day matches
const fix = ctx.fsync_diff_([r.shows[0]], [{ ...r.shows[0], _dateCell: true }])
assert.strictEqual(fix.update.length, 1)

console.log('sync.test.cjs: all checks passed')
