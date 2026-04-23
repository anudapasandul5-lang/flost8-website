// FLOST8 Bookings API — Google Apps Script
// Deploy as Web App: Execute as Me, Access: Anyone

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  var n = parseInt((e && e.parameter && e.parameter.n) || '20');
  if (action === 'upcoming') return getUpcoming(n);
  if (action === 'roster')   return getRoster();
  return jsonOut({ ok: false, error: 'unknown action' });
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  return handleInquiry(body);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Block 1: test_normaliseVenue ────────────────────────────────────────────

function test_normaliseVenue() {
  var cases = [
    ['Warehouse 21',        'warehouse 21'],
    ['Warehouse  21!',      'warehouse 21'],
    ['BLANK',               'blank'],
    ['Goa Sunset Sessions', 'goa sunset sessions'],
    ['  Club  XYZ  ',       'club xyz'],
  ];
  cases.forEach(function(c) {
    var got = normaliseVenue(c[0]);
    Logger.log(got === c[1]
      ? 'PASS: ' + c[0]
      : 'FAIL: "' + c[0] + '" got "' + got + '" want "' + c[1] + '"');
  });
}

// ─── Block 2: normaliseVenue implementation ───────────────────────────────────

function normaliseVenue(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Block 3: test_validateInquiry ───────────────────────────────────────────

function test_validateInquiry() {
  var valid = {
    event_date: '2027-01-01', venue: 'Warehouse 21', city: 'Colombo, LK',
    event_type: 'NIGHT', set_duration_h: 3,
    organizer_name: 'Shehan P.', direct_number: '+94771234567',
    organizer_email: 'shehan@example.com',
    other_artists: '', console_setup: 'CDJ-3000 x2, DJM-A9'
  };

  var errs = validateInquiry(valid);
  Logger.log(errs.length === 0 ? 'PASS: valid body' : 'FAIL: valid body got ' + JSON.stringify(errs));

  var noDate = Object.assign({}, valid, { event_date: '' });
  errs = validateInquiry(noDate);
  Logger.log(errs.some(function(e) { return e.field === 'event_date'; })
    ? 'PASS: missing date caught' : 'FAIL: missing date not caught');

  var badEmail = Object.assign({}, valid, { organizer_email: 'notanemail' });
  errs = validateInquiry(badEmail);
  Logger.log(errs.some(function(e) { return e.field === 'organizer_email'; })
    ? 'PASS: bad email caught' : 'FAIL: bad email not caught');

  var badDuration = Object.assign({}, valid, { set_duration_h: 99 });
  errs = validateInquiry(badDuration);
  Logger.log(errs.some(function(e) { return e.field === 'set_duration_h'; })
    ? 'PASS: bad duration caught' : 'FAIL: bad duration not caught');
}

// ─── Block 4: validateInquiry implementation ──────────────────────────────────

function validateInquiry(body) {
  var errors = [];

  function req(field, min, max) {
    var v = String(body[field] || '').trim();
    if (!v) { errors.push({ field: field, message: 'Required' }); return; }
    if (min && v.length < min) errors.push({ field: field, message: 'Too short (min ' + min + ')' });
    if (max && v.length > max) errors.push({ field: field, message: 'Too long (max ' + max + ')' });
  }

  req('event_date');
  if (body.event_date) {
    var d = new Date(String(body.event_date) + 'T00:00:00+05:30');
    if (d <= new Date()) errors.push({ field: 'event_date', message: 'Must be a future date' });
  }

  req('venue', 2, 80);
  req('city', 2, 80);

  if (['NIGHT', 'DAY'].indexOf(body.event_type) === -1) {
    errors.push({ field: 'event_type', message: 'Must be NIGHT or DAY' });
  }

  var dur = parseFloat(body.set_duration_h);
  if (isNaN(dur) || dur < 1 || dur > 8) {
    errors.push({ field: 'set_duration_h', message: 'Must be between 1 and 8 hours' });
  }

  req('organizer_name', 2, 80);

  var digits = String(body.direct_number || '').replace(/\D/g, '');
  if (digits.length < 6) errors.push({ field: 'direct_number', message: 'Invalid phone number' });

  if (!body.organizer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.organizer_email))) {
    errors.push({ field: 'organizer_email', message: 'Valid email address required' });
  }

  req('console_setup', 10, 500);

  return errors;
}

// ─── Block 5: rateLimitCheck and dedupCheck ───────────────────────────────────

function rateLimitCheck(phone) {
  var cache = CacheService.getScriptCache();
  var key = 'rate:' + String(phone).replace(/\D/g, '');
  var current = parseInt(cache.get(key) || '0');
  if (current >= 5) return false;
  cache.put(key, String(current + 1), 3600);
  return true;
}

function dedupCheck(phone, venue, date) {
  var cache = CacheService.getScriptCache();
  var key = 'dedup:' + [String(phone).replace(/\D/g, ''), normaliseVenue(venue), String(date)].join(':');
  if (cache.get(key)) return true;
  cache.put(key, '1', 300);
  return false;
}

// ─── Block 6: getActiveArtists ────────────────────────────────────────────────

function getActiveArtists() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('artists_config');
  if (cached) return JSON.parse(cached);

  var ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('BOOKINGS_SHEET_ID')
  );
  var sheet = ss.getSheetByName('artists');
  var data = sheet.getDataRange().getValues();
  // headers row 0: [slug, display_name, calendar_id, photo_url, active]
  var result = data.slice(1)
    .filter(function(row) {
      return row[4] === true || String(row[4]).toUpperCase() === 'TRUE';
    })
    .map(function(row) {
      return { slug: String(row[0]), display_name: String(row[1]),
               calendar_id: String(row[2]), photo_url: String(row[3]) };
    })
    .sort(function(a, b) { return a.display_name.localeCompare(b.display_name); });

  cache.put('artists_config', JSON.stringify(result), 300);
  return result;
}

// ─── Block 7: getRoster ───────────────────────────────────────────────────────

function getRoster() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('roster');
  if (cached) return jsonOut({ ok: true, artists: JSON.parse(cached) });

  var artists = getActiveArtists();
  var result = artists.map(function(a) {
    return { slug: a.slug, display_name: a.display_name, photo_url: a.photo_url };
  });
  cache.put('roster', JSON.stringify(result), 300);
  return jsonOut({ ok: true, artists: result });
}

// ─── Block 8: getUpcoming ─────────────────────────────────────────────────────

function getUpcoming(n) {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'upcoming:' + n;
  var cached = cache.get(cacheKey);
  if (cached) return jsonOut({ ok: true, events: JSON.parse(cached) });

  var artists = getActiveArtists();
  var now = new Date();
  var twoYears = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
  var allEvents = [];

  artists.forEach(function(artist) {
    try {
      var cal = CalendarApp.getCalendarById(artist.calendar_id);
      if (!cal) { Logger.log('Calendar not found: ' + artist.calendar_id); return; }
      cal.getEvents(now, twoYears, { max: n }).forEach(function(ev) {
        allEvents.push({
          date:           Utilities.formatDate(ev.getStartTime(), 'Asia/Colombo', 'yyyy-MM-dd'),
          time:           Utilities.formatDate(ev.getStartTime(), 'Asia/Colombo', 'HH:mm'),
          venue:          ev.getTitle(),
          city:           ev.getLocation() || '',
          artist_display: artist.display_name,
          artist_slug:    artist.slug,
          _key: normaliseVenue(ev.getTitle()) + ':'
                + Utilities.formatDate(ev.getStartTime(), 'Asia/Colombo', 'yyyy-MM-dd')
        });
      });
    } catch (err) {
      Logger.log('Calendar read error for ' + artist.slug + ': ' + err);
    }
  });

  // Merge events that share the same venue+date key (B2B across calendars)
  var merged = {};
  allEvents.forEach(function(ev) {
    if (merged[ev._key]) {
      merged[ev._key].artist_display += ' + ' + ev.artist_display;
    } else {
      merged[ev._key] = ev;
    }
  });

  var result = Object.keys(merged).map(function(k) {
    var ev = merged[k];
    return { date: ev.date, time: ev.time, venue: ev.venue,
             city: ev.city, artist_display: ev.artist_display, artist_slug: ev.artist_slug };
  })
  .sort(function(a, b) { return (a.date + a.time).localeCompare(b.date + b.time); })
  .slice(0, n);

  cache.put(cacheKey, JSON.stringify(result), 300);
  return jsonOut({ ok: true, events: result });
}

// ─── Block 9: verifyTurnstile ─────────────────────────────────────────────────

function verifyTurnstile(token) {
  if (!token) return false;
  var secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
  var resp = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'post',
    payload: { secret: secret, response: String(token) },
    muteHttpExceptions: true
  });
  var result = JSON.parse(resp.getContentText());
  return result.success === true;
}

// ─── Block 10: generateLeadId ─────────────────────────────────────────────────

function generateLeadId() {
  var ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('BOOKINGS_SHEET_ID')
  );
  var lastRow = ss.getSheetByName('Bookings').getLastRow();
  var seq = String(Math.max(lastRow, 1)).padStart(3, '0');
  var today = Utilities.formatDate(new Date(), 'Asia/Colombo', 'yyyy-MM-dd');
  return 'L-' + today + '-' + seq;
}

// ─── Block 11: writeBookingRow ────────────────────────────────────────────────

function writeBookingRow(body, leadId) {
  var ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('BOOKINGS_SHEET_ID')
  );
  var ts = Utilities.formatDate(new Date(), 'Asia/Colombo', 'yyyy-MM-dd HH:mm:ss');
  ss.getSheetByName('Bookings').appendRow([
    leadId, ts, 'site', '2-Qualified', 'skip',
    String(body.artist || 'any'),
    String(body.event_date || ''),
    String(body.venue || ''),
    String(body.city || ''),
    String(body.event_type || ''),
    parseFloat(body.set_duration_h) || 0,
    String(body.organizer_name || ''),
    String(body.direct_number || ''),
    String(body.organizer_email || ''),
    String(body.other_artists || 'TBD'),
    String(body.console_setup || ''),
    '', ''  // owner notes, quote status
  ]);
}

// ─── Block 12: sendBookerEmail and sendOwnerEmail ─────────────────────────────

function sendBookerEmail(body, leadId) {
  var props  = PropertiesService.getScriptProperties();
  var alias  = props.getProperty('FROM_EMAIL_ALIAS') || '';
  var wa     = props.getProperty('WHATSAPP_FALLBACK_NUMBER') || '';

  var artists = getActiveArtists();
  var matchArr = artists.filter(function(a) { return a.slug === body.artist; });
  var artistDisplay = (matchArr.length > 0 && body.artist !== 'any')
    ? matchArr[0].display_name : 'our team';

  var opts = {
    to: String(body.organizer_email),
    subject: 'We got your FLOST8 inquiry — ' + artistDisplay + ', ' + body.event_date,
    body: [
      'Hi ' + body.organizer_name + ',',
      '',
      'Got your inquiry for ' + body.venue + ' · ' + body.city + ' · ' + body.event_date + '.',
      'We read every one by hand. Expect a reply within 24 hrs.',
      '',
      'If the date is inside 72 hours, WhatsApp us: ' + wa + '.',
      '',
      '— FLOST8',
      'flost8.lk'
    ].join('\n'),
    name: 'FLOST8'
  };
  if (alias) opts.replyTo = alias;
  MailApp.sendEmail(opts);
}

function sendOwnerEmail(body, leadId) {
  var props    = PropertiesService.getScriptProperties();
  var ownerEmail = props.getProperty('OWNER_EMAIL');
  var ssId     = props.getProperty('BOOKINGS_SHEET_ID');

  var artists = getActiveArtists();
  var matchArr = artists.filter(function(a) { return a.slug === body.artist; });
  var artistDisplay = (matchArr.length > 0 && body.artist !== 'any')
    ? matchArr[0].display_name : 'Any';

  MailApp.sendEmail({
    to: ownerEmail,
    subject: '[LEAD] ' + artistDisplay + ' · ' + body.event_date + ' · ' + body.venue,
    body: [
      'New site inquiry — Stage 2 (Qualified).',
      '',
      '  Artist:    ' + artistDisplay,
      '  Date:      ' + body.event_date,
      '  Venue:     ' + body.venue + ', ' + body.city,
      '  Type:      ' + body.event_type + ', ' + body.set_duration_h + 'h',
      '  Organizer: ' + body.organizer_name + ', ' + body.direct_number + ', ' + body.organizer_email,
      '  Lineup:    ' + (body.other_artists || 'TBD'),
      '  Setup:     ' + body.console_setup,
      '',
      'Sheet: https://docs.google.com/spreadsheets/d/' + ssId + '/edit'
    ].join('\n')
  });
}

// ─── Block 13: logEmailRetry ──────────────────────────────────────────────────

function logEmailRetry(body, leadId, err) {
  var ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('BOOKINGS_SHEET_ID')
  );
  var sheet = ss.getSheetByName('email_retry');
  if (!sheet) sheet = ss.insertSheet('email_retry');
  sheet.appendRow([
    new Date().toISOString(), leadId, 'owner+booker',
    String(body.organizer_email), JSON.stringify(body),
    String(err), 0, '', 'pending'
  ]);
}

// ─── Block 14: handleInquiry ──────────────────────────────────────────────────

function handleInquiry(body) {
  // Apps Script always returns HTTP 200; errors signalled in {ok:false} body

  if (!verifyTurnstile(body.token)) {
    return jsonOut({ ok: false, reason: 'bot_check_failed' });
  }

  var errors = validateInquiry(body);
  if (errors.length > 0) {
    return jsonOut({ ok: false, errors: errors });
  }

  if (!rateLimitCheck(body.direct_number)) {
    return jsonOut({ ok: false, reason: 'rate_limit' });
  }

  if (dedupCheck(body.direct_number, body.venue, body.event_date)) {
    return jsonOut({ ok: true, deduped: true });
  }

  // Write Sheet row FIRST so lead is never lost even if emails fail
  var leadId = generateLeadId();
  writeBookingRow(body, leadId);

  try {
    sendBookerEmail(body, leadId);
    sendOwnerEmail(body, leadId);
  } catch (err) {
    Logger.log('Email failed for ' + leadId + ': ' + err);
    logEmailRetry(body, leadId, err);
  }

  return jsonOut({ ok: true, lead_id: leadId });
}

// ─── Block 15: drainEmailRetry ───────────────────────────────────────────────

function drainEmailRetry() {
  var ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('BOOKINGS_SHEET_ID')
  );
  var sheet = ss.getSheetByName('email_retry');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  // columns: timestamp | lead_id | email_type | to_address | body_json | error | attempts | last_attempt | status
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][8]) === 'done') continue;
    try {
      var body = JSON.parse(String(data[i][4]));
      var leadId = String(data[i][1]);
      sendBookerEmail(body, leadId);
      sendOwnerEmail(body, leadId);
      sheet.getRange(i + 1, 7).setValue(parseInt(data[i][6]) + 1);
      sheet.getRange(i + 1, 8).setValue(new Date().toISOString());
      sheet.getRange(i + 1, 9).setValue('done');
    } catch (err) {
      sheet.getRange(i + 1, 7).setValue(parseInt(data[i][6]) + 1);
      sheet.getRange(i + 1, 8).setValue(new Date().toISOString());
    }
  }
}