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

// --- POST: a form was submitted ---------------------------------------------
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
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
    var sheet = getSpreadsheet().getSheetByName('Shows');
    if (!sheet || sheet.getLastRow() < 2) return json({ events: [] });

    var values = sheet.getDataRange().getValues();
    var header = values.shift().map(function (h) { return String(h).trim(); });
    var events = values.map(function (row) {
      var obj = {};
      header.forEach(function (key, i) { obj[key] = row[i]; });
      return obj;
    });
    return json({ events: events });
  } catch (err) {
    return json({ events: [] });
  }
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
