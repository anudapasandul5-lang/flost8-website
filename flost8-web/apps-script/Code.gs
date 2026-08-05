/**
 * FLOST8 form backend — Google Apps Script web app.
 *
 * Receives every form submission from the website (booking + join + partner +
 * collab), logs it to a per-type tab in the bound Google Sheet, and emails a
 * notification to the right inbox based on the `type` field.
 *
 * The website never decides the destination inbox — this file does.
 *
 * Deploy: see apps-script/README.md. After deploying, copy the /exec web-app URL
 * into the APPS_SCRIPT_URL env var (Cloudflare Pages + local .env + .dev.vars).
 */

// --- Sheet to log into ------------------------------------------------------
// Paste the ID from your Sheet URL:
//   docs.google.com/spreadsheets/d/THIS_LONG_ID/edit
// Leave '' only if the script is bound to the Sheet (Extensions -> Apps Script).
var SHEET_ID = '1uMv5zS9coUcgzn99arrZOexBbMzliBPL3Kl-GXdl_yA';

function getSpreadsheet() {
  return SHEET_ID
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

// --- Routing: form type -> notification inbox -------------------------------
var ROUTE = {
  booking: 'bookings@flost8.lk',
  join:    'admin@flost8.lk',
  partner: 'admin@flost8.lk',
  collab:  'admin@flost8.lk',
};

// Sheet tab per type. Tabs are created automatically on first submission.
var SHEET_TAB = {
  booking: 'Bookings',
  join:    'Join',
  partner: 'Partners',
  collab:  'Collabs',
};

// Human-readable subject line per type.
var SUBJECT = {
  booking: 'New booking enquiry',
  join:    'New roster application',
  partner: 'New partner request',
  collab:  'New collaboration proposal',
};

// Fields never shown in the email body / sheet.
var SKIP_FIELDS = { type: true, token: true };

// --- Shows admin -----------------------------------------------------------
var SHOWS_TAB = 'Shows';
var SHOWS_HEADERS = ['id', 'date', 'time', 'venue', 'city', 'artist', 'artist_display'];
var ADMIN_ACTIONS = { listShows: true, addShow: true, updateShow: true, deleteShow: true };

// --- POST: a form was submitted, OR an admin manages shows ------------------
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    // Admin show-management actions. Password is checked at the Cloudflare
    // Function; this verifies the server-only secret because the /exec URL is
    // public ("Anyone"), so the Function's password check alone is bypassable.
    if (payload.action && ADMIN_ACTIONS[payload.action]) {
      return handleAdmin(payload);
    }

    var type = String(payload.type || 'booking');

    if (!ROUTE[type]) {
      return json({ ok: false, errors: [{ message: 'Unknown form type' }] });
    }

    // Minimal server-side guard. The website validates first; this is a backstop.
    var email = payload.email || payload.organizer_email || '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return json({ ok: false, errors: [{ field: 'email', message: 'Valid email required' }] });
    }

    logToSheet(type, payload);
    sendNotification(type, payload, email);
    if (type === 'booking') sendWhatsAppAlert(payload);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, errors: [{ message: 'Server error: ' + err }] });
  }
}

// --- GET: website asks for upcoming shows -----------------------------------
// Reads an optional "Shows" tab (columns: date, time, venue, city, artist,
// artist_display). Returns { events: [...] }. Safe to leave the tab empty.
function doGet(e) {
  try {
    var sheet = getSpreadsheet().getSheetByName(SHOWS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return json({ events: [] });

    var values = sheet.getDataRange().getValues();
    var header = values.shift().map(function (h) { return String(h).trim(); });
    var events = values.map(function (row) {
      var obj = {};
      header.forEach(function (key, i) { obj[key] = row[i]; });
      return cleanReadRow_(obj);
    });
    // Sort chronologically so the public column reads in order regardless of the
    // row order in the sheet. Fail-open: an unsorted list beats a blank column.
    try {
      events.sort(function (a, b) { return dateKey_(a.date).localeCompare(dateKey_(b.date)); });
    } catch (sortErr) { /* leave unsorted */ }
    return json({ events: events });
  } catch (err) {
    return json({ events: [] });
  }
}

// Normalize a date cell (Date object, ISO string, or YYYY-MM-DD) to a sortable
// yyyy-MM-dd key. Unparseable -> far-future so junk sorts last, never throws.
function dateKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'UTC', 'yyyy-MM-dd');
  var m = String(v == null ? '' : v).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : '9999-99-99';
}

// --- Admin CRUD on the Shows tab -------------------------------------------
function handleAdmin(payload) {
  var secret = PropertiesService.getScriptProperties().getProperty('ADMIN_SECRET');
  if (!secret || String(payload.secret) !== secret) {
    return json({ ok: false, errors: [{ message: 'Unauthorized' }] });
  }

  // Serialize writes so two admins (or a double-submit) can't corrupt the sheet.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return json({ ok: false, errors: [{ message: 'Busy, please retry' }] });
  }

  try {
    switch (payload.action) {
      case 'listShows':  return json({ ok: true, shows: listShows_() });
      case 'addShow':    return json({ ok: true, show: addShow_(payload.show) });
      case 'updateShow': return json({ ok: true, show: updateShow_(payload.id, payload.show) });
      case 'deleteShow': return json({ ok: true, deleted: deleteShow_(payload.id) });
    }
    return json({ ok: false, errors: [{ message: 'Unknown action' }] });
  } catch (err) {
    return json({ ok: false, errors: [{ message: String(err) }] });
  } finally {
    lock.releaseLock();
  }
}

// Get the Shows tab, creating it (with header) or migrating an existing tab that
// predates the `id` column (insert it + backfill uuids for existing rows).
function getShowsSheet_() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHOWS_TAB) || ss.insertSheet(SHOWS_TAB);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHOWS_HEADERS);
    return sheet;
  }
  var header = showsHeader_(sheet);
  if (header.indexOf('id') === -1) {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue('id');
    var n = sheet.getLastRow() - 1;
    if (n > 0) {
      var ids = [];
      for (var i = 0; i < n; i++) ids.push([Utilities.getUuid()]);
      sheet.getRange(2, 1, n, 1).setValues(ids);
    }
  }
  forceTextColumns_(sheet);
  return sheet;
}

// Force date + time to PLAIN TEXT so Sheets never auto-coerces "2026-07-30" into a
// Date or "10:00 PM" into a time-of-day (which serialize back as ugly ISO strings).
function forceTextColumns_(sheet) {
  var header = showsHeader_(sheet);
  ['date', 'time'].forEach(function (col) {
    var i = header.indexOf(col);
    if (i !== -1) sheet.getRange(1, i + 1, sheet.getMaxRows(), 1).setNumberFormat('@');
  });
}

// Clean a row read from the sheet so old rows stored as Date objects still read
// nicely (belt + braces alongside the text-column fix above).
function cleanReadRow_(obj) {
  obj.date = cleanDate_(obj.date);
  if ('time' in obj) obj.time = cleanTime_(obj.time);
  return obj;
}

function cleanDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'UTC', 'yyyy-MM-dd');
  var s = String(v == null ? '' : v).trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : s;
}

function cleanTime_(v) {
  // A legacy time-of-day Date cell (epoch 1899-12-30) is unreliable — drop it.
  if (v instanceof Date) return '';
  return String(v == null ? '' : v).trim();
}

function showsHeader_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim(); });
}

function listShows_() {
  var sheet = getShowsSheet_();
  if (sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getValues();
  var header = values.shift().map(function (h) { return String(h).trim(); });
  return values.map(function (row) {
    var obj = {};
    header.forEach(function (k, i) { obj[k] = row[i]; });
    return cleanReadRow_(obj);
  });
}

function addShow_(show) {
  var sheet = getShowsSheet_();
  var header = showsHeader_(sheet);
  var record = normalizeShow_(show);
  record.id = Utilities.getUuid();
  sheet.appendRow(header.map(function (k) { return safeCell_(record[k]); }));
  return record;
}

function updateShow_(id, show) {
  var sheet = getShowsSheet_();
  var found = findRowById_(sheet, id);
  if (!found) throw 'Show not found';
  var record = normalizeShow_(show);
  record.id = String(id);
  var row = found.header.map(function (k) { return safeCell_(record[k]); });
  sheet.getRange(found.rowIndex, 1, 1, row.length).setValues([row]);
  return record;
}

function deleteShow_(id) {
  var sheet = getShowsSheet_();
  var found = findRowById_(sheet, id);
  if (!found) return false;
  sheet.deleteRow(found.rowIndex);
  return true;
}

function findRowById_(sheet, id) {
  var values = sheet.getDataRange().getValues();
  var header = values.shift().map(function (h) { return String(h).trim(); });
  var idCol = header.indexOf('id');
  if (idCol === -1) return null;
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      return { rowIndex: i + 2, header: header }; // +2: header row + 1-based
    }
  }
  return null;
}

// Server-side backstop mirroring the client's validateShow.
function normalizeShow_(show) {
  show = show || {};
  var out = {
    date: trim_(show.date),
    time: trim_(show.time),
    venue: trim_(show.venue),
    city: trim_(show.city),
    artist: trim_(show.artist),
    artist_display: trim_(show.artist_display),
  };
  if (!out.date || !out.venue || !out.city || !out.artist_display) {
    throw 'Missing required field';
  }
  return out;
}

function trim_(v) { return String(v == null ? '' : v).trim(); }

// Prevent spreadsheet formula injection: a value starting with = + - @ would be
// evaluated as a formula when the sheet is opened. Prefix with an apostrophe.
function safeCell_(v) {
  var s = trim_(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// --- Helpers ----------------------------------------------------------------
function logToSheet(type, payload) {
  var ss = getSpreadsheet();
  var name = SHEET_TAB[type] || 'Other';
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);

  var keys = Object.keys(payload).filter(function (k) { return !SKIP_FIELDS[k]; });

  // Write a header row the first time the tab is used.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['timestamp'].concat(keys));
  }

  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headerRow.map(function (h) {
    if (h === 'timestamp') return new Date();
    return payload[h] != null ? payload[h] : '';
  });
  sheet.appendRow(row);
}

function sendNotification(type, payload, replyTo) {
  var to = ROUTE[type];
  var subject = '[FLOST8] ' + (SUBJECT[type] || 'New submission');

  var rows = Object.keys(payload)
    .filter(function (k) { return !SKIP_FIELDS[k]; })
    .map(function (k) {
      return '<tr><td style="padding:4px 12px 4px 0;color:#888;vertical-align:top">' +
        esc(k) + '</td><td style="padding:4px 0">' + esc(payload[k]) + '</td></tr>';
    })
    .join('');

  var html = '<h2 style="font-family:sans-serif">' + esc(SUBJECT[type]) + '</h2>' +
    '<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">' +
    rows + '</table>';

  MailApp.sendEmail({
    to: to,
    replyTo: String(replyTo),
    subject: subject,
    htmlBody: html,
  });
}

// --- WhatsApp alert (bookings only) -----------------------------------------
// Sends a WhatsApp template message via the official Meta Cloud API to
// whichever person manages the requested artist. One shared sender (test
// number + permanent token, Script Properties WHATSAPP_CLOUD_PHONE_ID /
// WHATSAPP_CLOUD_TOKEN) messages each person's own number (per-person Script
// Property WHATSAPP_<NAME>_PHONE). See apps-script/README.md for the one-time
// Meta setup (app, test number, token, recipient whitelist, template
// approval) and the current artist -> person assignments.
// ponytail: token MUST be a permanent System User token — a default 24h user
// token would silently break alerts after a day. Test-number recipient cap is
// 5 numbers; migrate to a verified business number if that's ever exceeded.
var WHATSAPP_ROUTE = {
  'imthxd':        'NIRBHEETH',
  'anush':         'NIRBHEETH',
  'the-professor': 'NIRBHEETH',
  'sonal':         'KASUNI',
  'dr-green':      'KASUNI',
  'maalin':        'KASUNI',
};

function sendWhatsAppAlert(payload) {
  var recipient = WHATSAPP_ROUTE[String(payload.artist)];
  if (!recipient) return; // artist not in the routing table — no one to alert

  var props = PropertiesService.getScriptProperties();
  var phone = props.getProperty('WHATSAPP_' + recipient + '_PHONE');
  var phoneId = props.getProperty('WHATSAPP_CLOUD_PHONE_ID');
  var token = props.getProperty('WHATSAPP_CLOUD_TOKEN');
  if (!phone || !phoneId || !token) return;

  // Never let a Cloud API failure (network error, unapproved template,
  // un-whitelisted recipient, bad token) escape this function — doPost's
  // outer try/catch would otherwise report ok:false to the client even
  // though the booking was already logged and emailed.
  try {
    var url = 'https://graph.facebook.com/v20.0/' + phoneId + '/messages';
    // Parameter order is positional, not semantic — must match the
    // {{1}}..{{6}} order the "booking_alert" template body was written in.
    var body = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: 'booking_alert',
        language: { code: 'en_US' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: trim_(payload.artist) },
            { type: 'text', text: trim_(payload.event_date) },
            { type: 'text', text: trim_(payload.venue) },
            { type: 'text', text: trim_(payload.city) },
            { type: 'text', text: trim_(payload.organizer_name) },
            { type: 'text', text: trim_(payload.direct_number) },
          ],
        }],
      },
    };
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    });
  } catch (err) {
    // fail-open: booking is already recorded, a missed WhatsApp ping isn't fatal
  }
}

// Escape free text so submitted values can't inject HTML into the email.
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
