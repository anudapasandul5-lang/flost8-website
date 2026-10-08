// FLOST8 booking sync: confirmed shows in the sales managers' sheets -> the Shows tab
// the website reads. Paste this as a NEW file (sync.gs) in the live Apps Script project;
// do not touch admin.gs. Every name is prefixed fsync_/FSYNC so nothing in the other
// files can collide with it.
//
// Rules (agreed 2026-10-06):
//  - A row publishes when Status = "Booking Confirmed", the date is today or later, and it
//    is not marked POSTPONED / CANCELLED (managers write that in the Balance column).
//  - Same date + same event across artist tabs = ONE B2B/B3B show ("SONAL B2B MAALIN").
//  - venue = Event Name (price tags like " - 150K" stripped), city = Venue / Page Name as written.
//  - Rows that look confirmed but can't be trusted (bad date, wrong year, no event name,
//    no location) are NOT published; they are listed on the "Sync issues" tab.
//  - Only rows whose id starts "sync:" are ever changed or deleted. Hand-added rows are safe.
//  - Money columns are never read into the output.

var FSYNC = {
  SHOWS_SHEET_ID: '1uMv5zS9coUcgzn99arrZOexBbMzliBPL3Kl-GXdl_yA',
  SHOWS_TAB: 'Shows',
  ISSUES_TAB: 'Sync issues',
  TZ: 'Asia/Colombo',
  PREFIX: 'sync:',
  SOURCES: [
    { id: '1qBBtNYlbg3z3og7wb_RdeHlZkbGU_ihVxfHJdl1__do', tabs: ['Sonal', 'Maalin', 'Dr Green'] }, // Kasuni
    { id: '1f9_KX_W0hAZmf4A-_iXeVoTdgkv1vB1-xWon-bSIauo', tabs: ['Anush', 'Professor'] }          // Nirbheeth (add 'IMTHXD' when he makes the tab)
  ],
  // lower-cased tab name -> roster slug + display name (src/lib/artistRoster.ts)
  ARTISTS: {
    'sonal': { slug: 'sonal', name: 'SONAL' },
    'maalin': { slug: 'maalin', name: 'MAALIN' },
    'dr green': { slug: 'dr-green', name: 'DR. GREEN' },
    'anush': { slug: 'anush', name: 'ANUSH' },
    'professor': { slug: 'the-professor', name: 'THE PROFESSOR' },
    'imthxd': { slug: 'imthxd', name: 'IMTHXD' }
  }
};

var FSYNC_MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY',
  'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

// ---------------------------------------------------------------------------
// Pure logic (no Apps Script APIs) — covered by sync.test.js
// ---------------------------------------------------------------------------

// Event-name key: case, punctuation and doubled letters ignored ("Limmina" == "Limina").
function fsync_norm_(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(.)\1+/g, '$1');
}

// "Wild Air 1.0 - 150K" -> "Wild Air 1.0". The sheets put the fee in the event name.
function fsync_cleanEvent_(s) {
  return String(s == null ? '' : s)
    .replace(/\s*[-–—]\s*\d+(\.\d+)?\s*[kK]\b/g, '')
    .replace(/\s+/g, ' ').trim();
}

// raw is "D:yyyy-mm-dd" (a real date cell, flattened by fsync_values_) or typed text
// "d/m/yyyy" / "d.m.yyyy". Returns { date:'yyyy-mm-dd', swapped } or { error }.
// A real date cell can have day and month swapped by the sheet (3 July stored as 7 March);
// the month header row above (JULY) says which reading is right.
function fsync_parseDate_(raw, secMonth, secYear) {
  var s = String(raw == null ? '' : raw).trim(), y, m, d, swapped = false, t;
  var iso = s.match(/^D:(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    y = +iso[1]; m = +iso[2]; d = +iso[3];
    if (secMonth && m !== secMonth) {
      if (d !== secMonth) return { error: 'date ' + s.slice(2) + ' does not fit the ' + FSYNC_MONTHS[secMonth - 1] + ' block' };
      t = m; m = d; d = t; swapped = true;
    }
  } else {
    var txt = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
    if (!txt) return { error: 'unreadable date "' + s + '"' };
    d = +txt[1]; m = +txt[2]; y = +txt[3];
  }
  var chk = new Date(Date.UTC(y, m - 1, d));
  if (chk.getUTCFullYear() !== y || chk.getUTCMonth() !== m - 1 || chk.getUTCDate() !== d) {
    return { error: 'not a real date "' + s + '"' };
  }
  if (secYear && y !== secYear) return { error: 'year ' + y + ' inside a ' + secYear + ' block (' + y + '-' + fsync_p2_(m) + '-' + fsync_p2_(d) + ')' };
  return { date: y + '-' + fsync_p2_(m) + '-' + fsync_p2_(d), swapped: swapped };
}

function fsync_p2_(n) { return (n < 10 ? '0' : '') + n; }

// One tab's values (header row first) -> { rows, issues }. today = 'yyyy-mm-dd'.
function fsync_readTab_(tabName, values, today) {
  var artist = FSYNC.ARTISTS[String(tabName).toLowerCase()];
  var out = { rows: [], issues: [] };
  if (!artist) { out.issues.push({ tab: tabName, row: 1, show: '', problem: 'tab name is not in FSYNC.ARTISTS' }); return out; }
  if (!values || !values.length) return out;
  var col = {};
  values[0].forEach(function (h, i) { col[String(h).trim().toLowerCase()] = i; });
  var need = ['event name', 'venue / page name', 'status'];
  for (var n = 0; n < need.length; n++) {
    if (col[need[n]] === undefined) { out.issues.push({ tab: tabName, row: 1, show: '', problem: 'column "' + need[n] + '" is missing' }); return out; }
  }
  var get = function (r, h) { var i = col[h]; return i === undefined ? '' : r[i]; };
  var secMonth = null, secYear = 2026;
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var rawDate = get(r, 'event date') !== '' ? get(r, 'event date') : get(r, 'date');
    var event = String(get(r, 'event name')).trim();
    if (String(get(r, 'deleted')).toLowerCase() === 'true') continue;
    if (!String(get(r, 'artist')).trim() && !event) {          // month / year header rows
      var h = String(rawDate).trim().toUpperCase();
      var mi = FSYNC_MONTHS.indexOf(h);
      if (mi !== -1) secMonth = mi + 1;
      else if (/^20\d\d(\.0)?$/.test(h)) secYear = parseInt(h, 10);
      continue;
    }
    if (String(get(r, 'status')).trim().toLowerCase() !== 'booking confirmed') continue;
    var flags = [get(r, 'balance (lkr)'), get(r, 'notes'), rawDate].join(' ');
    if (/POSTPONED|CANCELL?ED/i.test(flags)) continue;
    var show = event || '(no event name)';
    var p = fsync_parseDate_(rawDate, secMonth, secYear);
    if (p.error) { out.issues.push({ tab: tabName, row: i + 1, show: show, problem: p.error }); continue; }
    if (p.date < today) continue;
    if (!event || /^TB[AC]\b/i.test(event)) { out.issues.push({ tab: tabName, row: i + 1, show: p.date + ' ' + show, problem: 'no real event name' }); continue; }
    var place = String(get(r, 'venue / page name')).replace(/\s+/g, ' ').trim();
    if (!place || /^TB[AC]$/i.test(place)) { out.issues.push({ tab: tabName, row: i + 1, show: p.date + ' ' + fsync_cleanEvent_(event), problem: 'no location' }); continue; }
    out.rows.push({ date: p.date, event: fsync_cleanEvent_(event), place: place, artist: artist });
  }
  return out;
}

// tabs = [{ name, values }] -> { shows, issues }. Shows sorted by date, B2B merged.
function fsync_build_(tabs, today) {
  var byKey = {}, order = [], issues = [];
  tabs.forEach(function (t) {
    var res = fsync_readTab_(t.name, t.values, today);
    issues = issues.concat(res.issues);
    res.rows.forEach(function (r) {
      var key = r.date + '|' + fsync_norm_(r.event);
      var s = byKey[key];
      if (!s) { s = byKey[key] = { id: FSYNC.PREFIX + key, date: r.date, venue: r.event, city: r.place, artists: [] }; order.push(s); }
      if (s.artists.indexOf(r.artist) === -1) s.artists.push(r.artist);
    });
  });
  var shows = order.map(function (s) {
    return {
      id: s.id, date: s.date, venue: s.venue, city: s.city,
      artist: s.artists[0].slug,
      artist_display: s.artists.map(function (a) { return a.name; }).join(' B2B ')
    };
  }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1; });
  return { shows: shows, issues: issues };
}

// Diff desired synced shows against rows already in the Shows tab. rows = array of
// { id, date, venue, city, artist, artist_display } (only the `sync:` ones matter).
function fsync_diff_(desired, existing) {
  var have = {}; existing.forEach(function (e) { if (String(e.id).indexOf(FSYNC.PREFIX) === 0) have[e.id] = e; });
  var want = {}; desired.forEach(function (d) { want[d.id] = d; });
  var add = [], update = [], remove = [];
  desired.forEach(function (d) {
    var e = have[d.id];
    if (!e) { add.push(d); return; }
    if (e._dateCell || ['date', 'venue', 'city', 'artist', 'artist_display'].some(function (k) { return String(e[k]) !== String(d[k]); })) update.push(d);
  });
  Object.keys(have).forEach(function (id) { if (!want[id]) remove.push(have[id]); });
  return { add: add, update: update, remove: remove };
}

// ---------------------------------------------------------------------------
// Apps Script glue
// ---------------------------------------------------------------------------

// A Date cell -> "D:yyyy-mm-dd" in its own spreadsheet's timezone; everything else as-is.
function fsync_values_(sheet) {
  var tz = sheet.getParent().getSpreadsheetTimeZone();
  return sheet.getDataRange().getValues().map(function (row) {
    return row.map(function (v) {
      return v instanceof Date ? 'D:' + Utilities.formatDate(v, tz, 'yyyy-MM-dd') : v;
    });
  });
}

// Run this on a timer (fsyncInstallTrigger). Safe to run by hand any time.
function fsyncRun() { fsync_run_(false); }

// Same as fsyncRun but writes nothing — logs what WOULD change. Use for the first run.
function fsyncDryRun() { fsync_run_(true); }

function fsync_run_(dry) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var today = Utilities.formatDate(new Date(), FSYNC.TZ, 'yyyy-MM-dd');
    var tabs = [];
    FSYNC.SOURCES.forEach(function (src) {
      var ss = SpreadsheetApp.openById(src.id);
      src.tabs.forEach(function (name) {
        var sh = ss.getSheetByName(name);
        // A missing tab aborts the run: deleting shows because a source looked empty is worse than being stale.
        if (!sh) throw new Error('Tab "' + name + '" not found in "' + ss.getName() + '"');
        tabs.push({ name: name, values: fsync_values_(sh) });
      });
    });
    var built = fsync_build_(tabs, today);

    var target = SpreadsheetApp.openById(FSYNC.SHOWS_SHEET_ID);
    var sheet = target.getSheetByName(FSYNC.SHOWS_TAB) || target.insertSheet(FSYNC.SHOWS_TAB);
    if (sheet.getLastRow() === 0) sheet.appendRow(['id', 'date', 'time', 'venue', 'city', 'artist', 'artist_display', 'ticket_link']);
    var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
    ['id', 'date', 'venue', 'city', 'artist', 'artist_display'].forEach(function (c) {
      if (header.indexOf(c) === -1) throw new Error('Shows tab is missing column "' + c + '"');
    });
    var data = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, header.length).getValues() : [];
    var existing = data.map(function (row, i) {
      var o = { _row: i + 2 };
      header.forEach(function (h, j) { o[h] = row[j]; });
      // A real Date cell is read a day early by the website, so flag it for a rewrite as text.
      if (o.date instanceof Date) { o.date = Utilities.formatDate(o.date, target.getSpreadsheetTimeZone(), 'yyyy-MM-dd'); o._dateCell = true; }
      return o;
    });
    var diff = fsync_diff_(built.shows, existing);

    Logger.log((dry ? 'DRY RUN. ' : '') + 'publish ' + built.shows.length + ' | add ' + diff.add.length +
      ' | update ' + diff.update.length + ' | remove ' + diff.remove.length + ' | issues ' + built.issues.length);
    diff.add.forEach(function (s) { Logger.log('  + ' + s.date + '  ' + s.artist_display + '  ' + s.venue + ' @ ' + s.city); });
    diff.update.forEach(function (s) { Logger.log('  ~ ' + s.date + '  ' + s.artist_display + '  ' + s.venue + ' @ ' + s.city); });
    diff.remove.forEach(function (s) { Logger.log('  - ' + s.date + '  ' + s.artist_display + '  ' + s.venue); });
    built.issues.forEach(function (x) { Logger.log('  ! ' + x.tab + ' row ' + x.row + ': ' + x.show + ' — ' + x.problem); });
    if (dry) return;

    var at = function (h) { return header.indexOf(h) + 1; };
    sheet.getRange(1, at('date'), sheet.getMaxRows(), 1).setNumberFormat('@'); // keep "2026-10-09" as text
    diff.remove.sort(function (a, b) { return b._row - a._row; }).forEach(function (e) { sheet.deleteRow(e._row); });
    // rows shifted by the deletes above, so re-read positions for updates
    var ids = sheet.getLastRow() > 1 ? sheet.getRange(2, at('id'), sheet.getLastRow() - 1, 1).getValues() : [];
    diff.update.forEach(function (s) {
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === s.id) {
          ['date', 'venue', 'city', 'artist', 'artist_display'].forEach(function (k) { sheet.getRange(i + 2, at(k)).setValue(s[k]); });
          break;
        }
      }
    });
    // Not appendRow: it auto-parses "2026-10-09" into a Date cell. Format as text first, then setValues.
    if (diff.add.length) {
      var first = sheet.getLastRow() + 1;
      var block = sheet.getRange(first, 1, diff.add.length, header.length);
      block.setNumberFormat('@');
      block.setValues(diff.add.map(function (s) {
        return header.map(function (h) { return s[h] !== undefined ? s[h] : ''; });
      }));
    }

    var iss = target.getSheetByName(FSYNC.ISSUES_TAB) || target.insertSheet(FSYNC.ISSUES_TAB);
    iss.clear();
    var stamp = 'Last sync ' + Utilities.formatDate(new Date(), FSYNC.TZ, 'yyyy-MM-dd HH:mm') + ' — fix these in the manager sheets; they are NOT on the website yet.';
    var rows = [[stamp, '', '', ''], ['Tab', 'Row', 'Show', 'Problem']].concat(
      built.issues.map(function (x) { return [x.tab, x.row, x.show, x.problem]; }));
    iss.getRange(1, 1, rows.length, 4).setValues(rows);
  } finally {
    lock.releaseLock();
  }
}

// Run once by hand to start the every-15-minutes sync (replaces any earlier trigger).
function fsyncInstallTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'fsyncRun') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('fsyncRun').timeBased().everyMinutes(15).create();
}
