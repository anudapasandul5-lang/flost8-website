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