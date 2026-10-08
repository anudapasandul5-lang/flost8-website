// Run: npm i --no-save @electric-sql/pglite && node supabase/proofs/audit_batch_a.proof.mjs
// Proofs for the 2026-10-08 security audit leads fixed in migration 014 (see wiki/analyses/2026-10-08-flost8-security-audit):
//   1. unowned-inquiry child tables (inquiry_artists / inquiry_money) obey can_view, and a removed manager gets nothing
//   2. a signed-in user cannot plant import identity (source, sheet_key, submission_id, sheet_updated_at) on INSERT
//   3. merge history no longer hands every manager the inquiry / reminder ids of other managers
// In-memory Postgres (PGlite), real migrations, no live database.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../migrations', import.meta.url))
const db = new PGlite()
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
let pass = 0, fail = 0
const ok = (cond, name, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`) }
const allFiles = readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()
const apply = async (f) => { try { await db.exec(readFileSync(join(dir, f), 'utf8')) } catch (e) { ok(false, `migration ${f} applies`, e.message); process.exit(1) } }
const fix = allFiles.find((f) => f.includes('_014_'))
for (const f of allFiles.filter((x) => x !== fix)) await apply(f)
const q = async (sql, params) => (await db.query(sql, params)).rows
const as = async (uid, role = 'authenticated') => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false), set_config('request.jwt.claim.role', '${role}', false); set role ${role}`)
}
const su = async () => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', '', false)`)
const fails = async (sql, re, name) => {
  try { await db.query(sql); ok(false, name, 'expected an error, got none') } catch (e) { ok(re.test(e.message), name, e.message) }
}
const rows = async (sql) => (await q(sql)).length

// --- people ----------------------------------------------------------------------------------------------------
await su()
await db.exec(`
  update public.managers set email = 'kasuni@x.test' where name = 'Kasuni';
  update public.managers set email = 'nirbheeth@x.test' where name = 'Nirbheeth';
  insert into public.managers (name, role, email) values ('Owner', 'owner', 'owner@x.test'), ('Gone', 'manager', 'gone@x.test');
  insert into auth.users (email, email_confirmed_at) values ('kasuni@x.test', now()), ('nirbheeth@x.test', now()), ('owner@x.test', now()), ('gone@x.test', now());
`)
const ppl = Object.fromEntries((await q(`select name, user_id, id from public.managers`)).map((r) => [r.name, r]))
const K = ppl.Kasuni, N = ppl.Nirbheeth, O = ppl.Owner, G = ppl.Gone
const GONE_UID = G.user_id
// the owner removes Gone: the managers link goes, the Supabase session (JWT) is still valid until it expires
await db.query(`update public.managers set user_id = null where id = $1`, [G.id])

// --- 0. a merge recorded BEFORE the fix (old format, ids in the readable history row) is carried over by the migration --------
const LC1 = '00000000-0000-0000-0000-00000000d001', LC2 = '00000000-0000-0000-0000-00000000d002'
const LH = '00000000-0000-0000-0000-00000000d0b1'
await su()
await db.exec(`
  insert into public.contacts (id, name) values ('${LC1}', 'Legacy one'), ('${LC2}', 'Legacy two');
  insert into public.inquiries (id, source, status, event_name, event_date, contact_id, owner_id) values ('${LH}', 'manual', 'quoted', 'Legacy hidden', current_date + 60, '${LC1}', '${N.id}');
  insert into public.inquiry_artists values ('${LH}', 1, 'anush');
`)
await as(K.user_id)
await db.query(`select public.merge_contacts('${LC2}'::uuid, array['${LC1}'::uuid], '{}'::jsonb)`)
await su()
const legacyHist = (await q(`select id, data from public.contact_history where contact_id = '${LC2}' and kind = 'merged'`))[0]
ok(JSON.stringify(legacyHist.data).includes(LH), 'fixture: before the fix the readable history row holds the hidden inquiry id')
if (fix) await apply(fix)
else ok(false, 'migration 014 exists')
ok(!JSON.stringify((await q(`select data from public.contact_history where id = $1`, [legacyHist.id]))).includes(LH), 'migration strips the hidden inquiry id out of a pre-existing merge history row')
ok((await q(`select links from public.contact_merge_links where history_id = $1`, [legacyHist.id])).some((r) => JSON.stringify(r.links).includes(LH)), 'migration moved that id to the private links table')
await as(K.user_id)
await db.query(`select public.undo_merge(${legacyHist.id})`)
await su()
ok((await q(`select contact_id from public.inquiries where id = '${LH}'`))[0].contact_id === LC1, 'undo of a pre-existing merge still restores the link after the migration')
await as(K.user_id)
await fails(`select * from public.contact_merge_links`, /permission denied/, 'a manager cannot read the private links table')
await as(null, 'anon')
await fails(`select * from public.contact_merge_links`, /permission denied/, 'anon cannot read the private links table')

// --- 1. unowned inquiry child tables ------------------------------------------------------------------------------
const U = '00000000-0000-0000-0000-0000000000a1'  // ownerless, Nirbheeth's artist is on the lineup at position 2
const UP = '00000000-0000-0000-0000-0000000000a2' // ownerless, nobody's artist on the lineup
const KM = '00000000-0000-0000-0000-0000000000a3' // Kasuni's own manual inquiry
await su()
await db.exec(`
  insert into public.artists (slug, name, manager_id) values ('unmanaged-dj', 'Unmanaged DJ', null);
  insert into public.inquiries (id, source, status, event_name, event_date) values
    ('${U}', 'website', 'new', 'Ownerless with N', current_date + 20),
    ('${UP}', 'website', 'new', 'Ownerless nobody', current_date + 21),
    ('${KM}', 'manual', 'quoted', 'Kasuni own', current_date + 22);
  update public.inquiries set owner_id = '${K.id}' where id = '${KM}';
  insert into public.inquiry_artists values ('${U}', 2, 'anush'), ('${UP}', 2, 'unmanaged-dj'), ('${KM}', 1, 'sonal');
  insert into public.inquiry_money (inquiry_id, fee, advance, balance) values ('${U}', 100, 10, 90), ('${UP}', 200, 20, 180), ('${KM}', 300, 30, 270);
`)
// The unmanaged artist slug may not exist in artists; make sure the lineup row stands
ok((await q(`select 1 from public.inquiry_artists where inquiry_id = '${UP}'`)).length === 1, 'fixture: ownerless inquiry with an unmanaged artist exists')

for (const [who, uid] of [['Kasuni (a manager with no link to the inquiry)', K.user_id], ['a removed manager with a still-valid session', GONE_UID]]) {
  await as(uid)
  ok((await rows(`select 1 from public.inquiries where id = '${UP}'`)) === 0, `${who}: cannot see the ownerless inquiry (baseline)`)
  ok((await rows(`select 1 from public.inquiry_money where inquiry_id = '${UP}'`)) === 0, `${who}: cannot read its money`)
  ok((await rows(`select 1 from public.inquiry_artists where inquiry_id = '${UP}'`)) === 0, `${who}: cannot read its lineup`)
  ok((await rows(`select 1 from public.inquiry_money where inquiry_id = '${UP}' and fee = 200`)) === 0, `${who}: cannot find the amount`)
  ok((await rows(`update public.inquiry_money set fee = 1 where inquiry_id = '${UP}' returning 1`)) === 0, `${who}: cannot change its money`)
  ok((await rows(`delete from public.inquiry_artists where inquiry_id = '${UP}' returning 1`)) === 0, `${who}: cannot delete its lineup`)
  await fails(`insert into public.inquiry_money (inquiry_id, fee) values ('${UP}', 1)`, /row-level security|violates|duplicate/, `${who}: cannot add money to it`)
  await fails(`insert into public.inquiry_artists values ('${UP}', 3, 'unmanaged-dj')`, /row-level security/, `${who}: cannot add a lineup row to it`)
}
await as(K.user_id)
{
  // a manager adding an event: the inquiry first (hers), then the lineup the way the app does it (insert .. on conflict do nothing)
  const NEWQ = '00000000-0000-0000-0000-0000000000a9'
  await db.query(`insert into public.inquiries (id, source, status, event_name, event_date, owner_id) values ('${NEWQ}', 'manual', 'new', 'Fresh', current_date + 70, '${K.id}')`)
  ok((await rows(`insert into public.inquiry_artists (inquiry_id, position, artist_slug) values ('${NEWQ}', 1, 'sonal') on conflict (inquiry_id, position) do nothing returning 1`)) === 1, 'Kasuni can add the lineup to an event she just created')
  ok((await rows(`insert into public.inquiry_money (inquiry_id, fee) values ('${NEWQ}', 10) returning 1`)) === 1, 'Kasuni can add money to an event she just created')
}
// the parent table's own update rule agrees with the child tables
ok((await rows(`update public.inquiries set notes = 'poke' where id = '${UP}' returning 1`)) === 0, 'Kasuni cannot update an ownerless inquiry she cannot see')
await as(GONE_UID)
ok((await rows(`update public.inquiries set notes = 'poke' where id = '${UP}' returning 1`)) === 0, 'a removed manager cannot update an ownerless inquiry')
await as(N.user_id)
ok((await rows(`update public.inquiries set notes = 'poke' where id = '${U}' returning 1`)) === 1, 'Nirbheeth can still update an ownerless inquiry that has his artist')
await as(K.user_id)
// the other manager's money stays hidden too (already true before the fix: the baseline)
await as(K.user_id)
ok((await rows(`select 1 from public.inquiry_money where inquiry_id = '${U}'`)) === 0, "Kasuni cannot read money of an ownerless inquiry she has no artist on")

// Nothing the fix removes that should stay:
await as(N.user_id)
ok((await rows(`select 1 from public.inquiry_money where inquiry_id = '${U}'`)) === 1, 'Nirbheeth (artist on the lineup) still reads the money of the ownerless inquiry')
ok((await rows(`select 1 from public.inquiry_artists where inquiry_id = '${U}'`)) >= 1, 'Nirbheeth still reads its lineup')
await as(O.user_id)
ok((await rows(`select 1 from public.inquiry_money where inquiry_id in ('${U}', '${UP}')`)) === 2, 'the owner still reads every ownerless inquiry money row')
ok((await rows(`update public.inquiry_money set fee = 201 where inquiry_id = '${UP}' returning 1`)) === 1, 'the owner can still edit an ownerless inquiry money row')
await as(K.user_id)
ok((await rows(`select 1 from public.inquiry_money where inquiry_id = '${KM}'`)) === 1, 'Kasuni still reads money on her own inquiry')
ok((await rows(`update public.inquiry_money set fee = 301 where inquiry_id = '${KM}' returning 1`)) === 1, 'Kasuni can still edit money on her own inquiry')
ok((await rows(`update public.inquiry_artists set artist_slug = 'sonal' where inquiry_id = '${KM}' and position = 1 returning 1`)) === 1, 'Kasuni can still edit the lineup on her own inquiry')
await fails(`insert into public.inquiry_money (inquiry_id, fee) values ('${U}', 5)`, /row-level security|duplicate/, 'Kasuni cannot write to an inquiry that is not hers')
await as(N.user_id)
ok((await rows(`update public.inquiry_money set fee = 101 where inquiry_id = '${U}' returning 1`)) === 1, 'Nirbheeth can edit money of an ownerless inquiry that has his artist (unchanged)')

// --- 2. import identity cannot be planted on INSERT ---------------------------------------------------------------
await as(K.user_id)
const ins = (extra) => `insert into public.inquiries (source, status, event_name, event_date, owner_id ${extra.cols ?? ''}) values ('${extra.source ?? 'manual'}', 'new', 'Planted', current_date + 40, '${K.id}' ${extra.vals ?? ''})`
await fails(ins({ cols: ', sheet_key', vals: ", 'Tab|2026-12-01|test'" }), /identity|42501|read-only|not allowed/i, 'a manager cannot plant a sheet_key on a new inquiry')
await fails(ins({ source: 'sheet_import' }), /identity|42501|read-only|not allowed/i, "a manager cannot create a row with source 'sheet_import'")
await fails(ins({ source: 'website' }), /identity|42501|read-only|not allowed/i, "a manager cannot create a row with source 'website'")
await fails(ins({ cols: ', submission_id', vals: ", 'sub-1'" }), /identity|42501|read-only|not allowed/i, 'a manager cannot plant a submission_id')
await fails(ins({ cols: ', sheet_updated_at', vals: ', now()' }), /identity|42501|read-only|not allowed/i, 'a manager cannot plant sheet_updated_at')
ok((await rows(`insert into public.inquiries (source, status, event_name, event_date, owner_id) values ('manual', 'new', 'Plain manual', current_date + 41, '${K.id}') returning 1`)) === 1, 'a plain manual inquiry by a manager still works')
await as(O.user_id)
await fails(ins({ cols: ', sheet_key', vals: ", 'Tab|2026-12-02|owner'" }), /identity|42501|read-only|not allowed/i, 'even the owner role cannot plant a sheet_key from the app')
ok((await rows(`insert into public.inquiries (source, status, event_name, event_date) values ('manual', 'new', 'Owner manual', current_date + 42) returning 1`)) === 1, 'the owner can still add a manual inquiry')
await su()
await db.exec(`insert into public.inquiries (source, status, event_name, event_date, sheet_key, sheet_updated_at) values ('sheet_import', 'quoted', 'Imported', current_date + 43, 'Tab|2026-12-03|imp', now())`)
ok((await q(`select count(*)::int n from public.inquiries where sheet_key = 'Tab|2026-12-03|imp'`))[0].n === 1, 'the service role (importer, website intake) can still set the import columns')
await as(null, 'service_role')
await db.exec(`insert into public.inquiries (source, status, event_name, event_date, submission_id) values ('website', 'new', 'Intake', current_date + 44, 'sub-intake-1')`)
ok(true, 'service_role intake insert with a submission_id works')

// --- 3. merge history ids ------------------------------------------------------------------------------------------
await su()
const C1 = '00000000-0000-0000-0000-00000000c0a1', C2 = '00000000-0000-0000-0000-00000000c0a2'
const HID = '00000000-0000-0000-0000-0000000000b1' // Nirbheeth-only inquiry linked to C1
await db.exec(`
  insert into public.contacts (id, name) values ('${C1}', 'Venue one'), ('${C2}', 'Venue two');
  insert into public.inquiries (id, source, status, event_name, event_date, contact_id, owner_id) values ('${HID}', 'manual', 'quoted', 'Hidden from Kasuni', current_date + 50, '${C1}', '${N.id}');
  insert into public.inquiry_artists values ('${HID}', 1, 'anush');
  insert into public.reminders (inquiry_id, manager_id, due_at, note, contact_id) values ('${HID}', '${N.id}', now() + interval '2 days', 'Nirbheeth private reminder', '${C1}');
`)
await as(K.user_id)
await db.query(`select public.merge_contacts('${C2}'::uuid, array['${C1}'::uuid], '{}'::jsonb)`)
const hist = await q(`select data from public.contact_history where contact_id = '${C2}'`)
const blob = JSON.stringify(hist)
ok(hist.length >= 1, 'a merge writes a history row Kasuni can read')
ok(!blob.includes(HID), "merge history readable by Kasuni does not contain the id of Nirbheeth's hidden inquiry", blob.slice(0, 200))
await su()
const remId = (await q(`select id from public.reminders where manager_id = '${N.id}' limit 1`))[0]?.id
await as(K.user_id)
ok(!remId || !JSON.stringify(await q(`select data from public.contact_history`)).includes(remId), "merge history readable by Kasuni does not contain the id of Nirbheeth's private reminder")
// Undo still works and restores the links, so the ids are kept somewhere private
await as(K.user_id)
const histId = (await q(`select id from public.contact_history where contact_id = '${C2}' and kind = 'merged' order by id desc limit 1`))[0]?.id
let undoErr = ''
try { await db.query(`select public.undo_merge(${histId})`) } catch (e) { undoErr = e.message }
ok(undoErr === '', 'undo_merge still works after the fix', undoErr)
await su()
ok((await q(`select contact_id from public.inquiries where id = '${HID}'`))[0].contact_id === C1, "undo restores Nirbheeth's inquiry link to the merged contact")
ok((await q(`select count(*)::int n from public.reminders where manager_id = '${N.id}' and inquiry_id = '${HID}'`))[0].n === 1, "Nirbheeth's reminder is untouched by the merge and undo")

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
