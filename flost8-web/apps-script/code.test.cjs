// Run: node apps-script/code.test.cjs   (no deps). Loads Code.gs as-is, stubs the Google services, checks
// formula-safe sheet cells and the PROXY_SECRET gate on doPost.
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path')
const ctx = {}
vm.createContext(ctx)
vm.runInContext(fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8'), ctx)

// --- fakes ---
let props = {}
ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null) }) }
ctx.ContentService = {
  MimeType: { JSON: 'json' },
  createTextOutput: (s) => ({ s, setMimeType() { return this } }),
}
// Sheets hides a leading apostrophe on read: "'=1+1" is stored as text and displays as "=1+1".
const shown = (v) => (typeof v === 'string' && /^'[=+\-@]/.test(v) ? v.slice(1) : v)
let sheet
function fakeSheet() {
  const rows = []
  return {
    rows,
    getLastRow: () => rows.length,
    getLastColumn: () => (rows[0] || []).length,
    getRange: () => ({ getValues: () => [rows[0].map(shown)] }),
    appendRow: (r) => rows.push(r.slice()),
  }
}
let mailed = 0
ctx.getSpreadsheet = () => ({ getSheetByName: () => sheet, insertSheet: () => sheet })
ctx.sendNotification = () => { mailed += 1 }
ctx.sendWhatsAppAlert = () => {}

// --- safeCell_ ---
const cell = (v) => ctx.safeCell_(v)
assert.strictEqual(cell('=1+1'), "'=1+1")
assert.strictEqual(cell('+1'), "'+1")
assert.strictEqual(cell('-1'), "'-1")
assert.strictEqual(cell('@x'), "'@x")
assert.strictEqual(cell('\t=2'), "'=2")   // leading tab/CR is trimmed first, then guarded
assert.strictEqual(cell('\r=3'), "'=3")
assert.strictEqual(cell('  Hello there  '), 'Hello there')
assert.strictEqual(cell('Anuda & Co.'), 'Anuda & Co.')
assert.strictEqual(cell(42), '42')
assert.strictEqual(cell(null), '')

// --- logToSheet: values and first-row headers are stored as literal text ---
sheet = fakeSheet()
ctx.logToSheet('join', { name: '=1+1', plus: '+1', minus: '-1', at: '@x', tab: '\t=2', cr: '\r=3', plain: 'normal text', '=cmd': 'y' })
assert.strictEqual(sheet.rows[0][0], 'timestamp')
assert.strictEqual(sheet.rows[0][8], "'=cmd")               // raw cell is guarded
assert.strictEqual(sheet.rows[1][1], "'=1+1")               // raw cell is guarded
assert.strictEqual(JSON.stringify(sheet.rows[1].slice(1).map(shown)), JSON.stringify(                        // what the owner sees
  ['=1+1', '+1', '-1', '@x', '=2', '=3', 'normal text', 'y']))
assert.strictEqual(JSON.stringify(sheet.rows[0].slice(1).map(shown)), JSON.stringify(['name', 'plus', 'minus', 'at', 'tab', 'cr', 'plain', '=cmd']))

// --- doPost: PROXY_SECRET gate (booking type, valid email) ---
const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).s)
const base = { type: 'booking', email: 'a@b.co', organizer_email: 'a@b.co', venue: 'Factory' }

// unset: open as before
props = {}
sheet = fakeSheet(); mailed = 0
assert.deepStrictEqual(post(base), { ok: true })
assert.strictEqual(mailed, 1)

// set: missing or wrong secret is refused, nothing is written or mailed
props = { PROXY_SECRET: 'long-random-value' }
sheet = fakeSheet(); mailed = 0
assert.deepStrictEqual(post(base), { ok: false, errors: [{ message: 'Unauthorized' }] })
assert.deepStrictEqual(post({ ...base, secret: 'wrong' }), { ok: false, errors: [{ message: 'Unauthorized' }] })
assert.strictEqual(sheet.rows.length, 0)
assert.strictEqual(mailed, 0)

// set and matching: accepted, and the secret is never written to the sheet
assert.deepStrictEqual(post({ ...base, secret: 'long-random-value' }), { ok: true })
assert.strictEqual(mailed, 1)
assert.ok(!sheet.rows[0].includes('secret'))
assert.strictEqual(sheet.rows[0].length, sheet.rows[1].length)

console.log('code.test.cjs: all assertions passed')
