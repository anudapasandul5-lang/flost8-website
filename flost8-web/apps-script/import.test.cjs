// Run: node apps-script/import.test.cjs   (no deps). Loads sync.gs + import.gs and checks the pure logic.
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path')
const ctx = {}
vm.createContext(ctx)
for (const f of ['sync.gs', 'import.gs']) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx)

const H = ['Row ID', 'Last Modified', 'Deleted', 'Type', 'Artist', 'Event Date', 'Event Name', 'Venue / Page Name', 'Contact Name',
  'Fee (LKR)', 'Advance (LKR)', 'Balance (LKR)', 'Total (LKR)', 'Booking Fee', 'Status', 'Notes']
const row = (o) => H.map((h) => (o[h] === undefined ? '' : o[h]))
const base = { Deleted: false, Artist: 'x', Status: 'Booking Confirmed' }
const hdr = (m) => row({ 'Event Date': m })
const read = (tab, rows) => ctx.fimp_readTab_(tab, [H, ...rows])

// money parsing: words never become numbers
assert.strictEqual(ctx.fimp_num_(2500), 2500)
assert.strictEqual(ctx.fimp_num_('2,500 (with Dev)'), 2500)
for (const w of ['FOC', 'same as above', '#VALUE!', '', null]) assert.strictEqual(ctx.fimp_num_(w), null)

// header rows set month/year, blank-status and deleted rows are skipped, past shows are kept
let r = read('Dr Green', [
  hdr('OCTOBER'),
  row({ ...base, 'Event Date': 'D:2026-10-12', 'Event Name': 'Ritual - 150K', 'Venue / Page Name': 'Colombo', 'Fee (LKR)': 150000, 'Balance (LKR)': 'POSTPONED', 'Total (LKR)': '#VALUE!' }),
  row({ ...base, 'Event Date': 'D:2026-10-20', 'Event Name': 'Gone', Deleted: true }),
  row({ ...base, 'Event Date': 'D:2026-10-21', 'Event Name': 'No status', Status: '' }),
  row({ ...base, 'Event Date': 'D:2026-10-03', 'Event Name': 'Old gig', 'Last Modified': 'D:2026-03-08' }),
])
assert.strictEqual(r.rows.length, 2)
const a = r.rows[0]
assert.strictEqual(a.inquiry.sheet_key, 'Dr Green|2026-10-12|ritual150k')
assert.strictEqual(a.inquiry.status, 'booking_confirmed')   // POSTPONED stays confirmed
assert.deepStrictEqual({ ...a.money }, { fee: 150000, advance: null, balance: null, balance_note: 'POSTPONED', total: null, booking_fee: null })
assert.strictEqual(a.artist_slug, 'dr-green')
assert.strictEqual(r.rows[1].inquiry.event_date, '2026-10-03') // earlier date still imported
assert.strictEqual(r.rows[1].inquiry.sheet_updated_at, '2026-03-08')

// Reached Out, cancelled -> lost, unknown status reported
r = read('Anush', [
  hdr('NOVEMBER'),
  row({ ...base, Status: 'Reached Out', 'Event Date': '13/11/2026', 'Event Name': 'Maybe' }),
  row({ ...base, 'Event Date': '14/11/2026', 'Event Name': 'Dead', Notes: 'CANCELLED by client' }),
  row({ ...base, Status: 'Pending', 'Event Date': '15/11/2026', 'Event Name': 'Odd' }),
])
assert.deepStrictEqual([...r.rows.map((x) => x.inquiry.status)], ['reached_out', 'lost'])
assert.strictEqual(r.rows[1].inquiry.lost_reason, 'Cancelled (from sheet)')
assert.strictEqual(r.rows[0].money, null)
assert.strictEqual(r.issues.length, 1)

// bad date still imports (no date) and is listed; same date+event twice gets distinct keys
r = read('Sonal', [
  row({ ...base, 'Event Date': 'TBC', 'Event Name': 'Mystery' }),
  row({ ...base, 'Event Date': '1.8.2026', 'Event Name': 'Twin' }),
  row({ ...base, 'Event Date': '1.8.2026', 'Event Name': 'Twin' }),
])
assert.strictEqual(r.rows[0].inquiry.event_date, null)
assert.strictEqual(r.rows[0].inquiry.sheet_key, 'Sonal|nodate|mystery')
assert.strictEqual(r.rows[1].inquiry.sheet_key + '#2', r.rows[2].inquiry.sheet_key)
assert.strictEqual(r.issues.length, 1)

// every inquiry object has the same keys (PostgREST bulk upsert requirement)
const keys = (x) => Object.keys(x.inquiry).sort().join()
assert.strictEqual(new Set(ctx.fimp_build_([{ name: 'Sonal', values: [H, row({ ...base, 'Event Date': '1.8.2026', 'Event Name': 'A' })] },
  { name: 'Anush', values: [H, row({ ...base, 'Event Date': '2.8.2026', 'Event Name': 'B', Notes: 'n' })] }]).rows.map(keys)).size, 1)

// unknown tab and missing column are reported, not thrown
assert.strictEqual(read('Nobody', []).issues.length, 1)
assert.strictEqual(ctx.fimp_readTab_('Sonal', [['Artist']]).issues.length, 1)

console.log('import.test.cjs: all checks passed')
