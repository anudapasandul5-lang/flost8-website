// FLOST8 booking import: the sales managers' sheets -> Supabase "Bookings Backend" (inquiries,
// inquiry_artists, inquiry_money). ONE-WAY: the sheets stay master until the cutover day, so every
// run overwrites the imported rows. Paste as a NEW file (import.gs) next to sync.gs; it reuses
// sync.gs's FSYNC settings and date parser, and every name here is prefixed fimp_/FIMP.
//
// Setup once: Project Settings -> Script properties -> add SUPABASE_URL and SUPABASE_SERVICE_KEY
// (the service_role key; never paste it into a file). Then run fimpDryRun, then fimpRun, then
// fimpInstallTrigger.
//
// Rules:
//  - One inquiry per sheet row that has a Status (Booking Confirmed / Reached Out). Blank-status rows
//    and rows with Deleted = TRUE are skipped. Past shows ARE imported (history).
//  - The Row ID column is blank on most rows, so the key is  tab | date | event name  (same
//    normalisation as sync.gs). Renaming an event or changing its date in the sheet creates a NEW
//    inquiry; the old one is only reported by the run, never deleted.
//  - CANCELLED in Balance/Notes -> status lost. POSTPONED stays booking_confirmed, the word goes
//    in balance_note. Words in money cells never become numbers; the whole original row is kept in `raw`.
//  - Bad / missing dates still import (event_date null) and are listed as issues so nothing is lost.

var FIMP = {
  STATUS: { 'booking confirmed': 'booking_confirmed', 'reached out': 'reached_out' }
};

// ---------------------------------------------------------------------------
// Pure logic (no Apps Script APIs) — covered by import.test.cjs
// ---------------------------------------------------------------------------

// 2500 | "2,500 (with Dev)" -> number; "FOC" / "same as above" / "#VALUE!" / "" -> null.
function fimp_num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var m = String(v == null ? '' : v).replace(/,/g, '').trim().match(/^\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function fimp_text_(v) {
  var s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  return s === '' ? null : s;
}

// "D:2026-09-03" (a flattened date cell) -> "2026-09-03"; anything else -> null.
function fimp_day_(v) {
  var m = String(v == null ? '' : v).match(/^D:(\d{4}-\d{2}-\d{2})$/);
  return m ? m[1] : null;
}

// One tab's values (header row first) -> { rows, issues }.
function fimp_readTab_(tabName, values) {
  var artist = FSYNC.ARTISTS[String(tabName).toLowerCase()];
  var out = { rows: [], issues: [] };
  if (!artist) { out.issues.push({ tab: tabName, row: 1, show: '', problem: 'tab name is not in FSYNC.ARTISTS' }); return out; }
  if (!values || !values.length) return out;
  var heads = values[0].map(function (h) { return String(h).trim(); });
  var col = {};
  heads.forEach(function (h, i) { col[h.toLowerCase()] = i; });
  if (col['status'] === undefined || col['event name'] === undefined) {
    out.issues.push({ tab: tabName, row: 1, show: '', problem: 'column "status" or "event name" is missing' });
    return out;
  }
  var get = function (r, h) { var i = col[h]; return i === undefined ? '' : r[i]; };
  var secMonth = null, secYear = 2026, seen = {};
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var rawDate = get(r, 'event date') !== '' ? get(r, 'event date') : get(r, 'date');
    var event = String(get(r, 'event name')).trim();
    if (String(get(r, 'deleted')).toLowerCase() === 'true') continue;
    if (!String(get(r, 'artist')).trim() && !event) {           // month / year header rows
      var h = String(rawDate).trim().toUpperCase();
      var mi = FSYNC_MONTHS.indexOf(h);
      if (mi !== -1) secMonth = mi + 1;
      else if (/^20\d\d(\.0)?$/.test(h)) secYear = parseInt(h, 10);
      continue;
    }
    var statusRaw = String(get(r, 'status')).trim().toLowerCase();
    if (!statusRaw) continue;
    var status = FIMP.STATUS[statusRaw];
    var label = event || '(no event name)';
    if (!status) { out.issues.push({ tab: tabName, row: i + 1, show: label, problem: 'unknown status "' + statusRaw + '" — skipped' }); continue; }

    var p = fsync_parseDate_(rawDate, secMonth, secYear);
    var date = p.error ? null : p.date;
    // A real date in the wrong year block (2025 rows in the 2026 block) is history, not garbage: keep it.
    var yr = p.error && p.error.match(/^year \d{4} inside .* \((\d{4}-\d{2}-\d{2})\)$/);
    if (yr) date = yr[1];
    if (p.error) out.issues.push({ tab: tabName, row: i + 1, show: label, problem: p.error + (date ? ' — imported with that date' : ' — imported without a date') });

    var balance = get(r, 'balance (lkr)');
    var flags = [balance, get(r, 'notes')].join(' ');
    var lostReason = null;
    if (/CANCELL?ED/i.test(flags)) { status = 'lost'; lostReason = 'Cancelled (from sheet)'; }

    var key = tabName + '|' + (date || 'nodate') + '|' + fsync_norm_(event);
    seen[key] = (seen[key] || 0) + 1;
    if (seen[key] > 1) key += '#' + seen[key];

    var raw = {};
    heads.forEach(function (h, j) { if (h && r[j] !== '' && r[j] != null) raw[h] = r[j]; });

    var money = {
      fee: fimp_num_(get(r, 'fee (lkr)')), advance: fimp_num_(get(r, 'advance (lkr)')),
      balance: fimp_num_(balance), balance_note: typeof balance === 'number' ? null : fimp_text_(balance),
      total: fimp_num_(get(r, 'total (lkr)')), booking_fee: fimp_num_(get(r, 'booking fee'))
    };
    if (money.balance !== null) money.balance_note = null;
    var hasMoney = Object.keys(money).some(function (k) { return money[k] !== null; });

    out.rows.push({
      artist_slug: artist.slug,
      money: hasMoney ? money : null,
      inquiry: {
        sheet_key: key, source: 'sheet_import', status: status, lost_reason: lostReason,
        sheet_updated_at: fimp_day_(get(r, 'last modified')),
        event_name: fimp_text_(event), event_date: date,
        venue: fimp_text_(get(r, 'venue / page name')),
        deal_type: fimp_text_(get(r, 'type')), lead_source: fimp_text_(get(r, 'lead source')),
        platform: fimp_text_(get(r, 'platform')), brand: fimp_text_(get(r, 'brand')),
        collab_type: fimp_text_(get(r, 'collab type')), invoice_no: fimp_text_(get(r, 'invoice no')),
        organizer_name: fimp_text_(get(r, 'contact name')),
        set_time: fimp_text_(get(r, 'set time / remarks') !== '' ? get(r, 'set time / remarks') : get(r, 'set time')),
        notes: fimp_text_(get(r, 'notes')), raw: raw
      }
    });
  }
  return out;
}

// tabs = [{ name, values }] -> { rows, issues }
function fimp_build_(tabs) {
  var rows = [], issues = [];
  tabs.forEach(function (t) {
    var res = fimp_readTab_(t.name, t.values);
    rows = rows.concat(res.rows);
    issues = issues.concat(res.issues);
  });
  return { rows: rows, issues: issues };
}

// Rows whose sheet_key was deleted in the app (migration 015, table deleted_sheet_keys) must not be imported again.
// keys = array of sheet_key strings -> { rows: the rest, skipped: how many were dropped }
function fimp_dropDeleted_(rows, keys) {
  var gone = {};
  keys.forEach(function (k) { gone[k] = true; });
  var kept = rows.filter(function (r) { return !gone[r.inquiry.sheet_key]; });
  return { rows: kept, skipped: rows.length - kept.length };
}

// ---------------------------------------------------------------------------
// Apps Script glue
// ---------------------------------------------------------------------------

function fimp_call_(method, path, body, prefer) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL'), key = props.getProperty('SUPABASE_SERVICE_KEY');
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Script properties first');
  var headers = { apikey: key, Authorization: 'Bearer ' + key };
  if (prefer) headers.Prefer = prefer;
  var res = UrlFetchApp.fetch(url.replace(/\/$/, '') + '/rest/v1/' + path, {
    method: method, contentType: 'application/json', headers: headers,
    payload: body ? JSON.stringify(body) : undefined, muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) throw new Error(method + ' ' + path + ' -> ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 300));
  var text = res.getContentText();
  return text ? JSON.parse(text) : null;
}

// Every key deleted in the app. Throws if it cannot be read: better to skip a run than to bring deleted rows back.
function fimp_deletedKeys_() {
  var keys = [], page = 1000, from = 0, got;
  do {
    got = fimp_call_('get', 'deleted_sheet_keys?select=sheet_key&order=sheet_key&limit=' + page + '&offset=' + from, null, null) || [];
    got.forEach(function (g) { keys.push(g.sheet_key); });
    from += page;
  } while (got.length === page);
  return keys;
}

function fimpRun() { fimp_run_(false); }
function fimpDryRun() { fimp_run_(true); }   // reads the sheets, writes nothing

function fimp_run_(dry) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var tabs = [];
    FSYNC.SOURCES.forEach(function (src) {
      var ss = SpreadsheetApp.openById(src.id);
      src.tabs.forEach(function (name) {
        var sh = ss.getSheetByName(name);
        if (!sh) throw new Error('Tab "' + name + '" not found in "' + ss.getName() + '"');
        tabs.push({ name: name, values: fsync_values_(sh) });
      });
    });
    var built = fimp_build_(tabs);
    var kept = fimp_dropDeleted_(built.rows, fimp_deletedKeys_());
    built.rows = kept.rows;
    if (kept.skipped) Logger.log('skipped ' + kept.skipped + ' rows deleted in the app');
    var counts = {};
    built.rows.forEach(function (r) { counts[r.inquiry.status] = (counts[r.inquiry.status] || 0) + 1; });
    Logger.log((dry ? 'DRY RUN. ' : '') + 'inquiries ' + built.rows.length + ' ' + JSON.stringify(counts) +
      ' | with money ' + built.rows.filter(function (r) { return r.money; }).length + ' | issues ' + built.issues.length);
    built.issues.forEach(function (x) { Logger.log('  ! ' + x.tab + ' row ' + x.row + ': ' + x.show + ' — ' + x.problem); });
    if (dry) return;

    // Bulk upsert needs every object to carry the same keys; fimp_readTab_ already does.
    var saved = fimp_call_('post', 'inquiries?on_conflict=sheet_key',
      built.rows.map(function (r) { return r.inquiry; }), 'resolution=merge-duplicates,return=representation');
    var idByKey = {};
    saved.forEach(function (s) { idByKey[s.sheet_key] = s.id; });

    fimp_call_('post', 'inquiry_artists?on_conflict=inquiry_id,position',
      built.rows.map(function (r) { return { inquiry_id: idByKey[r.inquiry.sheet_key], position: 1, artist_slug: r.artist_slug }; }),
      'resolution=ignore-duplicates');

    var money = built.rows.filter(function (r) { return r.money; }).map(function (r) {
      var m = {}; Object.keys(r.money).forEach(function (k) { m[k] = r.money[k]; });
      m.inquiry_id = idByKey[r.inquiry.sheet_key]; m.currency = 'LKR';
      return m;
    });
    if (money.length) fimp_call_('post', 'inquiry_money?on_conflict=inquiry_id', money, 'resolution=merge-duplicates');

    // Report (never delete) imported inquiries whose sheet row has gone or changed key.
    var have = fimp_call_('get', 'inquiries?source=eq.sheet_import&select=sheet_key', null, null) || [];
    have.forEach(function (h) { if (!(h.sheet_key in idByKey)) Logger.log('  ? in database but no longer in the sheets: ' + h.sheet_key); });
    Logger.log('saved ' + saved.length + ' inquiries, ' + money.length + ' money rows');
  } finally {
    lock.releaseLock();
  }
}

// Run once by hand to import every 15 minutes (replaces any earlier trigger).
function fimpInstallTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'fimpRun') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('fimpRun').timeBased().everyMinutes(15).create();
}
