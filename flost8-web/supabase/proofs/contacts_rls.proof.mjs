// Run: npm i --no-save @electric-sql/pglite && node supabase/proofs/contacts_rls.proof.mjs
// Local proof of migration 010 against migrations 001-009 in an in-memory Postgres (PGlite). Touches no live database.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../migrations', import.meta.url))
const only = process.argv[2] // optional: stop after this many migrations (for the "before" snapshot)
const db = new PGlite()

// --- Supabase stubs -------------------------------------------------------------------------------------------
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`)
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
for (const f of files) {
  if (only && f.includes(only)) break
  try { await db.exec(readFileSync(join(dir, f), 'utf8')) } catch (e) { console.log('MIGRATION FAILED', f, e.message); process.exit(1) }
  console.log('applied', f)
}

let pass = 0, fail = 0
const ok = (cond, name, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`) }

const as = async (uid, role = 'authenticated') => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false), set_config('request.jwt.claim.role', '${role}', false); set role ${role}`)
}
const su = async () => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', '', false)`)
const q = async (sql, params) => (await db.query(sql, params)).rows
const fails = async (sql, re, name) => {
  try { await db.query(sql); ok(false, name, 'expected an error, got none') }
  catch (e) { ok(re.test(e.message), name, e.message) }
}

// --- people + data ---------------------------------------------------------------------------------------------
await su()
await db.exec(`
  update public.managers set email = 'kasuni@x.test' where name = 'Kasuni';
  update public.managers set email = 'nirbheeth@x.test' where name = 'Nirbheeth';
  insert into public.managers (name, role, email) values ('Anuda', 'owner', 'owner@x.test');
  insert into auth.users (email, email_confirmed_at) values ('kasuni@x.test', now()), ('nirbheeth@x.test', now()), ('owner@x.test', now());
`)
const uid = Object.fromEntries((await q(`select m.name, m.user_id, m.id from public.managers m`)).map((r) => [r.name, r]))
const K = uid.Kasuni, N = uid.Nirbheeth, O = uid.Anuda
ok(K.user_id && N.user_id && O.user_id, 'three users linked to managers')

// sheet row owned by Kasuni (Sonal), manual row owned by Nirbheeth (Anush), one more Nirbheeth-only
await db.exec(`
  insert into public.inquiries (id, source, status, event_name, event_date, organizer_name, sheet_key, updated_at)
    values ('00000000-0000-0000-0000-0000000000a1', 'sheet_import', 'booking_confirmed', 'Sheet gig', '2026-12-01', 'Ruwan Perera', 'k|1', '2026-01-01');
  insert into public.inquiry_artists values ('00000000-0000-0000-0000-0000000000a1', 1, 'sonal');
  insert into public.inquiries (id, source, status, event_name, event_date, organizer_name)
    values ('00000000-0000-0000-0000-0000000000b1', 'manual', 'booking_confirmed', 'Anush gig', '2026-11-20', 'ruwan  perera');
  insert into public.inquiry_artists values ('00000000-0000-0000-0000-0000000000b1', 1, 'anush');
`)
const A1 = '00000000-0000-0000-0000-0000000000a1', B1 = '00000000-0000-0000-0000-0000000000b1'
const owners = await q(`select id, owner_id from public.inquiries order by id`)
ok(owners[0].owner_id === K.id && owners[1].owner_id === N.id, 'assign_owner trigger gave Kasuni the Sonal row and Nirbheeth the Anush row')

const baseline = String((await q(`select updated_at from public.inquiries where id = '00000000-0000-0000-0000-0000000000a1'`))[0].updated_at)
// --- contacts basics -------------------------------------------------------------------------------------------
await as(K.user_id)
const c1 = (await q(`insert into public.contacts (name, types, phones, owner_id) values ('Ruwan Perera', '{client}', '{0771234567}', $1) returning id`, [K.id]))[0].id
ok(!!c1, 'manager creates a contact')
await as(N.user_id)
ok((await q(`select id from public.contacts`)).length === 1, 'the other manager sees it (everyone sees all contacts)')
const c2 = (await q(`insert into public.contacts (name, types, emails, organisation) values ('Ruwan P', '{venue}', '{r@club.test}', 'Club X') returning id`))[0].id
ok((await q(`select created_by from public.contacts where id = $1`, [c2]))[0].created_by === N.id, 'created_by defaults to the signed-in manager')
await fails(`insert into public.contacts (name, types) values ('Bad', '{wizard}')`, /contacts_types_ok|check/, 'unknown type tag is refused')
await fails(`insert into public.contacts (name, instagram) values ('Bad', 'a b')`, /instagram/, 'bad instagram handle is refused')
await fails(`insert into public.contacts (name, deleted_at) values ('Ghost', now())`, /already deleted/, 'cannot create a contact already deleted')
await fails(`update public.contacts set created_by = null where id = '${c1}'`, /read-only/, 'cannot rewrite created_by')
await fails(`update public.contacts set merged_into = '${c1}' where id = '${c2}'`, /read-only/, 'cannot set merged_into directly')
const del = await q(`delete from public.contacts where id = $1 returning id`, [c2]).catch((e) => e)
ok(del instanceof Error || del.length === 0, 'users cannot hard-delete a contact', JSON.stringify(del))

// soft delete + restore + history
await db.query(`update public.contacts set deleted_at = now(), deleted_by = $2 where id = $1`, [c2, N.id])
await db.query(`update public.contacts set deleted_at = null, deleted_by = null where id = $1`, [c2])
await db.query(`update public.contacts set phones = '{0779999999}', city = 'Colombo' where id = $1`, [c2])
const hist = (await q(`select kind from public.contact_history where contact_id = $1 order by id`, [c2])).map((r) => r.kind)
ok(JSON.stringify(hist) === JSON.stringify(['created', 'deleted', 'restored', 'edited']), 'history records created / deleted / restored / edited', JSON.stringify(hist))
await fails(`insert into public.contact_history (contact_id, kind) values ('${c2}', 'created')`, /row-level security|permission/, 'history cannot be written by hand')

// --- linking inquiries -----------------------------------------------------------------------------------------
await as(K.user_id)
const before = (await q(`select updated_at from public.inquiries where id = $1`, [A1]))[0].updated_at
await db.query(`select public.set_inquiry_contact($1, $2)`, [A1, c1])
const after = (await q(`select contact_id, updated_at from public.inquiries where id = $1`, [A1]))[0]
ok(after.contact_id === c1, 'a manager can link a contact to a read-only sheet row')
ok(String(after.updated_at) === String(before), 'linking does not bump inquiries.updated_at', `${before} -> ${after.updated_at}`)
await fails(`update public.inquiries set event_name = 'hacked' where id = '${A1}'`, /read-only/, 'sheet row is still read-only for everything else')
await fails(`select public.set_inquiry_contact('${B1}', '${c1}')`, /not allowed/, "cannot link an inquiry you cannot view (Nirbheeth's Anush gig)")
await as(N.user_id)
await db.query(`select public.set_inquiry_contact($1, $2)`, [B1, c1])
await db.query(`update public.inquiries set contact_id = $2 where id = $1`, [B1, c2])
ok((await q(`select contact_id from public.inquiries where id = $1`, [B1]))[0].contact_id === c2, 'a manager can set contact_id on their own manual row directly')

// --- notes + reminders -----------------------------------------------------------------------------------------
await as(K.user_id)
await db.query(`insert into public.contact_notes (contact_id, kind, body) values ($1, 'call', 'Called, will confirm Friday')`, [c1])
ok((await q(`select author_id from public.contact_notes`))[0].author_id === K.id, 'note author defaults to me')
await fails(`insert into public.contact_notes (contact_id, author_id, body) values ('${c1}', '${N.id}', 'forged')`, /row-level security/, "cannot write a note as someone else")
await fails(`insert into public.contact_notes (contact_id, body) values ('${c1}', '   ')`, /check/, 'empty note is refused')
await fails(`insert into public.contact_notes (contact_id, body, inquiry_id) values ('${c1}', 'x', '${B1}')`, /row-level security/, 'cannot attach a note to an inquiry I cannot view')
await db.query(`insert into public.reminders (contact_id, manager_id, due_at, note) values ($1, $2, now() + interval '1 day', 'Chase Friday')`, [c1, K.id])
await fails(`insert into public.reminders (contact_id, manager_id, due_at) values ('${c1}', '${N.id}', now())`, /row-level security/, 'a manager cannot set a reminder for someone else')
await fails(`insert into public.reminders (manager_id, due_at) values ('${K.id}', now())`, /reminders_target|check/, 'a reminder needs a contact or an inquiry')
await as(N.user_id)
ok((await q(`select id from public.reminders`)).length === 0, "managers only see their own reminders")
const nid = (await q(`select id from public.contact_notes`))[0]?.id
await db.query(`delete from public.contact_notes where id = $1`, [nid])
ok((await q(`select id from public.contact_notes`)).length === 1, "a manager cannot delete someone else's note")
await as(O.user_id)
ok((await q(`select id from public.reminders`)).length === 1, 'the owner sees every reminder')
await db.query(`delete from public.contact_notes where id = $1`, [nid])
ok((await q(`select id from public.contact_notes`)).length === 0, 'the owner can delete any note')
await as(K.user_id)
await db.query(`insert into public.contact_notes (contact_id, kind, body) values ($1, 'note', 'back again')`, [c1])

// --- stats -----------------------------------------------------------------------------------------------------
const stats = (await q(`select * from public.contact_stats('2026-10-07')`)).find((r) => r.contact_id === c1)
ok(stats && stats.booked_count === 1 && new Date(stats.next_booked_date).toISOString().startsWith('2026-12-01') && stats.last_note_at, 'contact_stats counts the linked sheet booking and the note', JSON.stringify(stats))
ok(!('fee' in stats) && !('money' in stats), 'contact_stats carries no money')

// --- merge + undo ----------------------------------------------------------------------------------------------
await as(K.user_id)
const snapBefore = (await q(`select name, types, phones, emails, organisation, city from public.contacts where id = $1`, [c1]))[0]
await db.query(`select public.merge_contacts($1, $2::uuid[], '{"name":"Ruwan Perera"}')`, [c1, [c2]])
const merged = (await q(`select types, phones, emails, organisation from public.contacts where id = $1`, [c1]))[0]
ok(JSON.stringify(merged.types) === JSON.stringify(['client', 'venue']), 'merge unions the type tags', JSON.stringify(merged.types))
ok(merged.phones.length === 2 && merged.emails.length === 1 && merged.organisation === 'Club X', 'merge unions phones, emails and fills blanks', JSON.stringify(merged))
await su()
const moved = await q(`select id, contact_id from public.inquiries order by id`)
await as(K.user_id)
ok(moved.every((r) => r.contact_id === c1), 'merge moved both inquiries (including the read-only sheet row, and one Kasuni cannot even view)')
const gone = (await q(`select deleted_at, merged_into from public.contacts where id = $1`, [c2]))[0]
ok(gone.deleted_at && gone.merged_into === c1, 'merged contact is soft-deleted and points at the keeper')
const mh = (await q(`select id from public.contact_history where contact_id = $1 and kind = 'merged'`, [c1]))[0].id
await fails(`select public.merge_contacts('${c1}', array['${c1}']::uuid[])`, /itself/, 'cannot merge a contact into itself')
await db.query(`select public.undo_merge($1)`, [mh])
const back = (await q(`select name, types, phones, emails, organisation, city from public.contacts where id = $1`, [c1]))[0]
ok(JSON.stringify(back) === JSON.stringify(snapBefore), 'undo rewinds the keeper exactly', JSON.stringify(back) + ' vs ' + JSON.stringify(snapBefore))
const restored = (await q(`select deleted_at, merged_into from public.contacts where id = $1`, [c2]))[0]
ok(!restored.deleted_at && !restored.merged_into, 'undo restores the merged contact')
await su()
const inqs = await q(`select id, contact_id from public.inquiries order by id`)
await as(K.user_id)
ok(inqs[0].contact_id === c1 && inqs[1].contact_id === c2, 'undo puts each inquiry back where it was')
await fails(`select public.undo_merge(${mh})`, /already undone/, 'a merge can only be undone once')

// --- publish hold ----------------------------------------------------------------------------------------------
await as(N.user_id)
await fails(`update public.inquiries set no_auto_publish = true where id = '${B1}'`, /server-controlled/, 'a manager cannot set no_auto_publish directly')
await fails(`select public.set_inquiry_publish_hold('${B1}', true)`, /owner only/, 'a manager cannot use the hold function')
await as(O.user_id)
await db.query(`select public.set_inquiry_publish_hold($1, true)`, [B1])
ok((await q(`select no_auto_publish from public.inquiries where id = $1`, [B1]))[0].no_auto_publish === true, 'the owner can hold an event back')
await db.query(`select public.set_inquiry_publish_hold($1, false)`, [B1])
ok((await q(`select no_auto_publish from public.inquiries where id = $1`, [B1]))[0].no_auto_publish === false, 'the owner can release it')
await su()
await db.query(`update public.inquiries set no_auto_publish = true where id = $1`, [B1])
ok((await q(`select no_auto_publish from public.inquiries where id = $1`, [B1]))[0].no_auto_publish === true, 'SQL editor / service role can set it (cutover script)')
await db.query(`update public.inquiries set no_auto_publish = false where id = $1`, [B1])

// --- templates, anon -------------------------------------------------------------------------------------------
await as(K.user_id)
ok((await q(`select id from public.message_templates`)).length === 5, 'five starter templates seeded')
await db.query(`insert into public.message_templates (title, language, body) values ('Sinhala hello', 'Sinhala', 'ආයුබෝවන් {name}')`)
await db.query(`update public.message_templates set archived = true where title = 'Thank you'`)
ok((await q(`select id from public.message_templates`)).length === 6, 'a manager can add and archive templates')
await as(null, 'anon')
const anonRead = await q(`select id from public.contacts`).catch((e) => e)
ok(anonRead instanceof Error, 'anon cannot read contacts', JSON.stringify(anonRead))
const anonRpc = await q(`select * from public.contact_stats('2026-10-07')`).catch((e) => e)
ok(anonRpc instanceof Error, 'anon cannot call contact_stats')
await as(K.user_id)
await fails(`select public.purge_old_contacts()`, /permission denied/, 'users cannot purge')

// --- migration 011: undo keeps later edits, purge spares undoable merges ----------------------------------------
await as(K.user_id)
const before2 = (await q(`select phones, city, notes from public.contacts where id = $1`, [c1]))[0]
await db.query(`select public.merge_contacts($1, $2::uuid[], '{}')`, [c1, [c2]])
const mh2 = (await q(`select id from public.contact_history where contact_id = $1 and kind = 'merged' order by id desc limit 1`, [c1]))[0].id
await db.query(`update public.contacts set city = 'Galle', notes = 'edited after merge' where id = $1`, [c1])
await db.query(`select public.undo_merge($1)`, [mh2])
const after2 = (await q(`select phones, city, notes from public.contacts where id = $1`, [c1]))[0]
ok(after2.city === 'Galle' && after2.notes === 'edited after merge', 'undo keeps fields edited after the merge', JSON.stringify(after2))
ok(JSON.stringify(after2.phones) === JSON.stringify(before2.phones), 'undo still rewinds fields nobody touched since the merge', JSON.stringify(after2.phones) + ' vs ' + JSON.stringify(before2.phones))
await db.query(`select public.merge_contacts($1, $2::uuid[], '{}')`, [c1, [c2]])
const mh3 = (await q(`select id from public.contact_history where contact_id = $1 and kind = 'merged' order by id desc limit 1`, [c1]))[0].id
await su()
await db.query(`update public.contacts set deleted_at = now() - interval '40 days' where id = $1`, [c2])
const doomed = (await q(`insert into public.contacts (name, deleted_at) values ('Doomed', now() - interval '40 days') returning id`))[0].id
await as(null, 'service_role')
await db.query(`select public.purge_old_contacts()`)
await su()
ok((await q(`select id from public.contacts where id = $1`, [c2])).length === 1, 'purge leaves a merged-away contact so its merge stays undoable')
ok((await q(`select id from public.contacts where id = $1`, [doomed])).length === 0, 'purge still removes an ordinary contact deleted over 30 days ago')
await as(K.user_id)
await db.query(`select public.undo_merge($1)`, [mh3])
ok(!(await q(`select deleted_at from public.contacts where id = $1`, [c2]))[0].deleted_at, 'undo works after a purge run')
await db.query(`select public.merge_contacts($1, $2::uuid[], '{}')`, [c1, [c2]])
const mh4 = (await q(`select id from public.contact_history where contact_id = $1 and kind = 'merged' order by id desc limit 1`, [c1]))[0].id
await su()
await db.query(`delete from public.contacts where id = $1`, [c2])
await as(K.user_id)
await fails(`select public.undo_merge(${mh4})`, /no longer available/, 'undo refuses up front when a merged contact is gone')
await su()
await db.query(`update public.contact_history set data = data - 'after' where id = $1`, [mh4])
await as(K.user_id)
await fails(`select public.undo_merge(${mh4})`, /cannot be undone/, 'a merge recorded without an after-snapshot is refused')

// --- migration 012: snooze ------------------------------------------------------------------------------------
await su()
const touchBefore = String((await q(`select updated_at from public.inquiries where id = $1`, [A1]))[0].updated_at)
await as(K.user_id)
await db.query(`update public.inquiries set snoozed_until = '2026-10-16' where id = $1`, [A1])
await su()
{
  const r = (await q(`select snoozed_until::text s, updated_at from public.inquiries where id = $1`, [A1]))[0]
  ok(r.s === '2026-10-16', 'a manager can snooze a sheet-imported row they can edit')
  ok(String(r.updated_at) === touchBefore, 'snoozing does not bump updated_at (a snooze is not a touch)')
}
await as(K.user_id)
await db.query(`update public.inquiries set snoozed_until = null where id = $1`, [A1])
ok((await q(`select snoozed_until from public.inquiries where id = $1`, [A1]))[0].snoozed_until === null, 'a manager can unsnooze a sheet row')
await db.query(`update public.inquiries set snoozed_until = '2026-10-16', contact_id = $2 where id = $1`, [A1, c1])
ok(true, 'snoozed_until and contact_id may change together on a sheet row')
const sheetCols = ['status', 'lost_reason', 'sheet_updated_at', 'event_name', 'event_date', 'venue', 'city', 'deal_type', 'lead_source', 'platform', 'brand', 'collab_type', 'invoice_no', 'organizer_name', 'organizer_phone', 'organizer_email', 'set_time', 'notes', 'contract_url', 'travel_notes', 'ticket_link', 'owner_id', 'source', 'sheet_key']
const sample = { status: `'lost'`, lost_reason: `'x'`, sheet_updated_at: `'2026-02-02'`, event_name: `'hacked'`, event_date: `'2027-01-01'`, venue: `'v'`, city: `'c'`, deal_type: `'d'`, lead_source: `'l'`, platform: `'p'`, brand: `'b'`, collab_type: `'c'`, invoice_no: `'1'`, organizer_name: `'o'`, organizer_phone: `'1'`, organizer_email: `'e@x.y'`, set_time: `'9pm'`, notes: `'n'`, contract_url: `'https://x.y'`, travel_notes: `'t'`, ticket_link: `'https://x.y'`, owner_id: `'${N.id}'`, source: `'manual'`, sheet_key: `'zz'` }
for (const col of sheetCols) {
  await as(K.user_id)
  await fails(`update public.inquiries set snoozed_until = '2026-10-17', ${col} = ${sample[col]} where id = '${A1}'`, /read-only/, `a manager cannot change ${col} on a sheet row (even alongside a snooze)`)
}
await as(K.user_id)
await fails(`update public.inquiries set contract_signed = true where id = '${A1}'`, /read-only/, 'a manager cannot change contract_signed on a sheet row')
await su()
await db.query(`update public.inquiries set snoozed_until = '2026-10-16' where id = $1`, [A1])
// the importer (service role, no auth.uid) upserts only the columns it sends
await as(null, 'service_role')
await db.query(`insert into public.inquiries (sheet_key, source, status, lost_reason, sheet_updated_at, event_name, event_date, venue, deal_type, lead_source, platform, brand, collab_type, invoice_no, organizer_name, set_time, notes)
  values ('k|1', 'sheet_import', 'quoted', null, '2026-10-05', 'Sheet gig', '2026-12-01', 'New venue', null, null, null, null, null, null, 'Ruwan Perera', '9pm', 'changed in sheet')
  on conflict (sheet_key) do update set source = excluded.source, status = excluded.status, lost_reason = excluded.lost_reason, sheet_updated_at = excluded.sheet_updated_at,
    event_name = excluded.event_name, event_date = excluded.event_date, venue = excluded.venue, deal_type = excluded.deal_type, lead_source = excluded.lead_source,
    platform = excluded.platform, brand = excluded.brand, collab_type = excluded.collab_type, invoice_no = excluded.invoice_no, organizer_name = excluded.organizer_name,
    set_time = excluded.set_time, notes = excluded.notes`)
await su()
{
  const r = (await q(`select snoozed_until::text s, venue, status from public.inquiries where id = $1`, [A1]))[0]
  ok(r.venue === 'New venue' && r.status === 'quoted', 'importer-style upsert did update the sheet columns')
  ok(r.s === '2026-10-16', 'importer-style upsert leaves snoozed_until untouched', r.s)
}
await db.query(`update public.inquiries set venue = null, status = 'booking_confirmed', notes = null where id = $1`, [A1])
await as(N.user_id)
await db.query(`update public.inquiries set snoozed_until = '2026-10-20' where id = $1`, [B1])
ok((await q(`select snoozed_until::text s from public.inquiries where id = $1`, [B1]))[0].s === '2026-10-20', 'a manager can snooze their own app-added row')
await as(K.user_id)
const cross = await q(`update public.inquiries set snoozed_until = '2026-10-20' where id = $1 returning id`, [B1])
ok(cross.length === 0, "a manager cannot snooze another manager's row (RLS filters it out)")
await as(O.user_id)
await db.query(`update public.inquiries set snoozed_until = '2026-10-21' where id = $1`, [A1])
ok((await q(`select snoozed_until::text s from public.inquiries where id = $1`, [A1]))[0].s === '2026-10-21', 'the owner can snooze any row')
await su()
await db.query(`update public.inquiries set snoozed_until = null where id in ($1, $2)`, [A1, B1])

// --- migration 012: manager whatsapp ---------------------------------------------------------------------------
await su()
await db.query(`update public.managers set whatsapp = '+94771234567' where id = $1`, [K.id])
await fails(`update public.managers set whatsapp = 'call me' where id = '${K.id}'`, /managers_whatsapp_format|check/, 'the column itself refuses a malformed number')
await as(O.user_id)
await db.query(`select public.set_manager_whatsapp($1, '+94 77 765 4321')`, [N.id]).then(() => ok(false, 'spaces are not valid digits'), () => ok(true, 'the owner cannot store a number with spaces'))
await db.query(`select public.set_manager_whatsapp($1, '0777654321')`, [N.id])
{
  const rows = await q(`select * from public.manager_whatsapps()`)
  const by = Object.fromEntries(rows.map((r) => [r.manager_id, r.whatsapp]))
  ok(by[N.id] === '0777654321' && by[K.id] === '+94771234567', 'the owner reads every number through manager_whatsapps()', JSON.stringify(rows))
  ok(rows.every((r) => Object.keys(r).sort().join() === 'manager_id,whatsapp'), 'manager_whatsapps() returns exactly (manager_id, whatsapp)')
}
for (const bad of ['12345', '1234567890123456', '+', 'abc1234567', '+94-77-1234567', '++9477123456']) await fails(`select public.set_manager_whatsapp('${N.id}', '${bad}')`, /WhatsApp number must be/, `owner cannot set invalid number ${bad}`)
await db.query(`select public.set_manager_whatsapp($1, '+1234567')`, [N.id])
await db.query(`select public.set_manager_whatsapp($1, '+123456789012345')`, [N.id])
ok(true, '7 and 15 digits (with +) are accepted')
await db.query(`select public.set_manager_whatsapp($1, null)`, [N.id])
await db.query(`select public.set_manager_whatsapp($1, '  ')`, [K.id])
ok((await q(`select manager_id from public.manager_whatsapps()`)).length === 0, 'null or blank clears the number')
await fails(`select public.set_manager_whatsapp('00000000-0000-0000-0000-00000000dead', '+94771234567')`, /no such manager/, 'setting for an unknown manager is an error')
await db.query(`select public.set_manager_whatsapp($1, '+94771234567')`, [K.id])
ok((await q(`select id, name, email, role, user_id from public.managers`)).length === 3, 'the owner can still read the ordinary manager columns')
await fails(`select whatsapp from public.managers`, /permission denied/, 'even the owner cannot read the column through the table')
await fails(`select * from public.managers`, /permission denied/, 'select * on managers is refused for clients (app lists its columns)')
await as(K.user_id)
await fails(`select whatsapp from public.managers`, /permission denied/, 'a manager cannot read whatsapp through the table')
await fails(`select m.* from public.managers m`, /permission denied/, 'a manager cannot select * either')
await fails(`select id from public.managers where whatsapp is not null`, /permission denied/, 'a manager cannot probe whatsapp through a WHERE clause')
await fails(`select * from public.manager_whatsapps()`, /owner only/, 'a manager cannot call manager_whatsapps()')
await fails(`select public.set_manager_whatsapp('${K.id}', '+94771111111')`, /owner only/, 'a manager cannot set a number (not even their own)')
ok((await q(`update public.managers set whatsapp = '+94771111111' where id = $1 returning id`, [K.id])).length === 0, 'a manager cannot write the column through the table (RLS filters the row out)')
ok((await q(`select id, name, email, role, user_id, created_at from public.managers`)).length === 3, 'a manager can still read the ordinary manager columns')
await as(null, 'anon')
await fails(`select * from public.manager_whatsapps()`, /permission denied/, 'anon cannot call manager_whatsapps()')
await fails(`select public.set_manager_whatsapp('${K.id}', '+94771111111')`, /permission denied/, 'anon cannot call set_manager_whatsapp()')
await fails(`select whatsapp from public.managers`, /permission denied/, 'anon cannot read the column')
await su()
ok((await q(`select whatsapp from public.managers where id = $1`, [K.id]))[0].whatsapp === '+94771234567', 'nothing the non-owners tried changed the stored number')

// --- what 010 left untouched -----------------------------------------------------------------------------------
await su()
const bad = [{ n: String((await q(`select updated_at from public.inquiries where id = '00000000-0000-0000-0000-0000000000a1'`))[0].updated_at) === baseline ? 0 : 1 }]
ok(bad[0].n === 0, 'sheet row updated_at never moved through any of the above')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
