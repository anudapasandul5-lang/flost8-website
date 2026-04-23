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