// Run: npm i --no-save @electric-sql/pglite && node supabase/proofs/delete_all.proof.mjs
// Proofs for migration 015 (owner's request 2026-10-08: delete any inquiry, erase a trashed contact for good):
//   1. a manager deletes their OWN inquiry of any source, never another manager's or an ownerless one; the owner deletes any
//   2. a deleted sheet-imported inquiry leaves its key behind, only the importer (service role) can read it, and its children go with it
//   3. take_over_sheet_inquiry: owner or the owning manager turns ONE imported event into an editable app event and the importer is told to skip it
//   4. only the owner can erase a contact, and only one already in Trash; linked inquiries survive with no contact
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
const mine = allFiles.find((f) => f.includes('_015_'))
if (!mine) { ok(false, 'migration 015 exists'); process.exit(1) }
const apply = async (f) => { try { await db.exec(readFileSync(join(dir, f), 'utf8')) } catch (e) { ok(false, `migration ${f} applies`, e.message); process.exit(1) } }
for (const f of allFiles.filter((x) => x < mine)) await apply(f)
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
  insert into public.managers (name, role, email) values ('Owner', 'owner', 'owner@x.test');
  insert into auth.users (email, email_confirmed_at) values ('kasuni@x.test', now()), ('nirbheeth@x.test', now()), ('owner@x.test', now());
`)
const ppl = Object.fromEntries((await q(`select name, user_id, id from public.managers`)).map((r) => [r.name, r]))
const K = ppl.Kasuni, N = ppl.Nirbheeth, O = ppl.Owner

// --- fixtures (before the migration, so the "before" state is real) ------------------------------------------------
const id = (n) => `00000000-0000-0000-0000-0000000015${String(n).padStart(2, '0')}`
const KW = id(1), KS = id(2), KM = id(3), NW = id(4), OW = id(5), KW2 = id(6), NS = id(7)
await db.exec(`
  insert into public.inquiries (id, source, status, event_name, event_date, owner_id, sheet_key) values
    ('${KW}', 'website', 'new', 'K website', current_date + 10, '${K.id}', null),
    ('${KS}', 'sheet_import', 'quoted', 'K sheet', current_date + 11, '${K.id}', 'Kasuni|2026-12-01|K sheet'),
    ('${KM}', 'manual', 'quoted', 'K manual', current_date + 12, '${K.id}', null),
    ('${NW}', 'website', 'new', 'N website', current_date + 13, '${N.id}', null),
    ('${OW}', 'website', 'new', 'Ownerless website', current_date + 14, null, null),
    ('${KW2}', 'website', 'new', 'K website two', current_date + 15, '${K.id}', null),
    ('${NS}', 'sheet_import', 'quoted', 'N sheet', current_date + 16, '${N.id}', 'Nirbheeth|2026-12-02|N sheet');
  insert into public.inquiry_artists values ('${KS}', 1, 'sonal'), ('${KW}', 1, 'sonal');
  insert into public.inquiry_money (inquiry_id, fee, advance, balance) values ('${KS}', 500, 50, 450);
`)
await db.exec(`
  insert into public.contacts (id, name) values ('${id(50)}', 'Active contact'), ('${id(51)}', 'Trashed contact'), ('${id(52)}', 'Trashed two');
  update public.contacts set deleted_at = now() where id in ('${id(51)}', '${id(52)}');
  update public.inquiries set contact_id = '${id(51)}' where id = '${KM}';
  insert into public.contact_notes (contact_id, body) values ('${id(51)}', 'a note');
  insert into public.contact_history (contact_id, kind) values ('${id(51)}', 'created');
`)

// --- before: the old rule ---------------------------------------------------------------------------------------------
await as(K.user_id)
ok((await rows(`delete from public.inquiries where id = '${KW2}' returning 1`)) === 0, 'before 015: a manager cannot delete their own website inquiry (baseline)')
await su()
await apply(mine)

// --- 1. who may delete what ---------------------------------------------------------------------------------------------
await as(K.user_id)
ok((await rows(`delete from public.inquiries where id = '${KW}' returning 1`)) === 1, 'manager deletes their own website inquiry')
ok((await rows(`delete from public.inquiries where id = '${KM}' returning 1`)) === 1, 'manager still deletes their own app-added inquiry')
ok((await rows(`delete from public.inquiries where id = '${NW}' returning 1`)) === 0, "manager cannot delete another manager's website inquiry")
ok((await rows(`delete from public.inquiries where id = '${NS}' returning 1`)) === 0, "manager cannot delete another manager's sheet inquiry")
ok((await rows(`delete from public.inquiries where id = '${OW}' returning 1`)) === 0, 'manager cannot delete an ownerless inquiry')
await as(null, 'anon')
await fails(`delete from public.inquiries where id = '${KW2}'`, /permission denied/, 'anon cannot delete')
await as(O.user_id)
ok((await rows(`delete from public.inquiries where id = '${OW}' returning 1`)) === 1, 'owner deletes an ownerless website inquiry')
ok((await rows(`delete from public.inquiries where id = '${NW}' returning 1`)) === 1, "owner deletes another manager's website inquiry")

// --- 2. a deleted sheet row stays deleted, and its children go ------------------------------------------------------
await as(K.user_id)
ok((await rows(`delete from public.inquiries where id = '${KS}' returning 1`)) === 1, 'manager deletes their own sheet-imported inquiry')
await su()
ok((await rows(`select 1 from public.inquiry_artists where inquiry_id = '${KS}'`)) === 0, 'its lineup went with it')
ok((await rows(`select 1 from public.inquiry_money where inquiry_id = '${KS}'`)) === 0, 'its money went with it')
const tomb = await q(`select sheet_key, deleted_by from public.deleted_sheet_keys`)
ok(tomb.length === 1 && tomb[0].sheet_key === 'Kasuni|2026-12-01|K sheet' && tomb[0].deleted_by === K.id, 'its sheet_key is remembered, with who deleted it', JSON.stringify(tomb))
await as(O.user_id)
await db.query(`delete from public.inquiries where id = '${NS}'`)
await su()
ok((await rows(`select 1 from public.deleted_sheet_keys`)) === 2, 'the owner deleting a sheet row remembers it too')
ok((await rows(`select 1 from public.deleted_sheet_keys where sheet_key like '%website%' or sheet_key is null`)) === 0, 'rows without a sheet_key leave nothing behind')
await as(K.user_id)
await fails(`select * from public.deleted_sheet_keys`, /permission denied/, 'a manager cannot read the remembered keys')
await fails(`insert into public.deleted_sheet_keys (sheet_key) values ('x')`, /permission denied/, 'a manager cannot write the remembered keys')
await as(null, 'anon')
await fails(`select * from public.deleted_sheet_keys`, /permission denied/, 'anon cannot read the remembered keys')
await as(null, 'service_role')
ok((await rows(`select 1 from public.deleted_sheet_keys`)) === 2, 'the importer (service role) can read the remembered keys')

// a delete with no signed-in manager (SQL editor, a script) leaves nothing behind
await su()
await db.exec(`insert into public.inquiries (id, source, status, event_name, event_date, owner_id, sheet_key) values ('${id(9)}', 'sheet_import', 'quoted', 'Script row', current_date + 40, '${K.id}', 'Kasuni|2026-12-09|script row')`)
await db.exec(`delete from public.inquiries where id = '${id(9)}'`)
ok((await rows(`select 1 from public.deleted_sheet_keys where sheet_key = 'Kasuni|2026-12-09|script row'`)) === 0, 'a delete run from SQL (no signed-in manager) is not remembered')
ok((await rows(`select 1 from public.deleted_sheet_keys`)) === 2, 'only the two signed-in deletes are remembered')

// --- 3b. taking over an imported event so it can be edited ----------------------------------------------------------
const T1 = id(20), T2 = id(21), T3 = id(22), T4 = id(23)
await su()
await db.exec(`
  insert into public.inquiries (id, source, status, event_name, event_date, owner_id, sheet_key) values
    ('${T1}', 'sheet_import', 'booking_confirmed', 'Take one', current_date + 50, '${K.id}', 'Kasuni|2027-01-01|take one'),
    ('${T2}', 'sheet_import', 'booking_confirmed', 'Take two', current_date + 51, '${N.id}', 'Nirbheeth|2027-01-02|take two'),
    ('${T3}', 'sheet_import', 'quoted', 'Take three', current_date + 52, null, 'Ownerless|2027-01-03|take three'),
    ('${T4}', 'sheet_import', 'quoted', 'Take four', current_date + 53, '${K.id}', 'Kasuni|2027-01-04|take four');
  insert into public.inquiry_artists values ('${T1}', 1, 'sonal');
`)
await as(K.user_id)
await fails(`update public.inquiries set event_name = 'Edited' where id = '${T1}'`, /read-only/, 'baseline: a manager cannot edit an imported row directly')
await fails(`update public.inquiries set source = 'manual' where id = '${T1}'`, /read-only/, 'a manager cannot flip source by hand either')
await fails(`select public.take_over_sheet_inquiry('${T2}')`, /not allowed/, "a manager cannot take over another manager's event")
await fails(`select public.take_over_sheet_inquiry('${T3}')`, /not allowed/, 'a manager cannot take over an ownerless event')
await fails(`select public.take_over_sheet_inquiry('${id(99)}')`, /not allowed/, 'a missing id gives the same answer, so ids cannot be probed')
await as(null, 'anon')
await fails(`select public.take_over_sheet_inquiry('${T1}')`, /permission denied/, 'anon cannot take over')
await as(K.user_id)
await db.query(`select public.take_over_sheet_inquiry('${T1}')`)
const t1 = (await q(`select source, no_auto_publish from public.inquiries where id = '${T1}'`))[0]
ok(t1.source === 'manual' && t1.no_auto_publish === true, 'the owning manager takes over her own imported event: now an app event, held off the website', JSON.stringify(t1))
ok((await rows(`update public.inquiries set event_name = 'Edited' where id = '${T1}' returning 1`)) === 1, 'she can now edit it')
ok((await rows(`update public.inquiry_artists set artist_slug = 'sonal' where inquiry_id = '${T1}' returning 1`)) === 1, 'and its lineup')
await fails(`select public.take_over_sheet_inquiry('${T1}')`, /only an imported event/, 'taking over twice is refused')
await as(O.user_id)
await db.query(`select public.take_over_sheet_inquiry('${T3}')`)
await su()
ok((await q(`select source from public.inquiries where id = '${T3}'`))[0].source === 'manual', 'the owner takes over an ownerless event')
const kept = await q(`select sheet_key from public.deleted_sheet_keys where reason = 'taken_over' order by sheet_key`)
ok(kept.length === 2 && kept[0].sheet_key === 'Kasuni|2027-01-01|take one' && kept[1].sheet_key === 'Ownerless|2027-01-03|take three', 'both taken-over keys are on the importer skip list', JSON.stringify(kept))
ok((await q(`select source from public.inquiries where id = '${T4}'`))[0].source === 'sheet_import', 'an event nobody took over is untouched and still syncs')
await as(K.user_id)
await fails(`update public.inquiries set event_name = 'Edited' where id = '${T4}'`, /read-only/, 'the take-over switch does not leak: other imported rows are still read-only afterwards')

// --- 3. contacts ---------------------------------------------------------------------------------------------------------
await as(K.user_id)
ok((await rows(`delete from public.contacts where id = '${id(51)}' returning 1`)) === 0, 'a manager cannot erase a trashed contact')
await as(O.user_id)
ok((await rows(`delete from public.contacts where id = '${id(50)}' returning 1`)) === 0, 'the owner cannot erase a contact that is not in Trash')
ok((await rows(`delete from public.contacts where id = '${id(51)}' returning 1`)) === 1, 'the owner erases a trashed contact')
await su()
ok((await rows(`select 1 from public.contact_notes where contact_id = '${id(51)}'`)) === 0, 'its notes went with it')
ok((await rows(`select 1 from public.contact_history where contact_id = '${id(51)}'`)) === 0, 'its history went with it')
await as(null, 'anon')
await fails(`delete from public.contacts where id = '${id(52)}'`, /permission denied/, 'anon cannot erase a contact')

// the target of a merge cannot be erased while merged-away contacts still point at it
await su()
await db.exec(`
  insert into public.contacts (id, name, deleted_at) values ('${id(60)}', 'Merge target', now());
  insert into public.contacts (id, name, deleted_at, merged_into) values ('${id(61)}', 'Merged away', now(), '${id(60)}');
`)
await as(O.user_id)
ok((await rows(`delete from public.contacts where id = '${id(60)}' returning 1`)) === 0, 'a merge target cannot be erased while merged-away contacts point at it')
ok((await rows(`delete from public.contacts where id = '${id(61)}' returning 1`)) === 1, 'the merged-away contact can be erased')
ok((await rows(`delete from public.contacts where id = '${id(60)}' returning 1`)) === 1, 'then the merge target can too')

// an inquiry that pointed at an erased contact is kept and just loses the link
await su()
await db.exec(`
  insert into public.inquiries (id, source, status, event_name, event_date, owner_id, contact_id) values ('${id(8)}', 'manual', 'new', 'Linked', current_date + 30, '${K.id}', '${id(52)}');
`)
await as(O.user_id)
await db.query(`delete from public.contacts where id = '${id(52)}'`)
await su()
const linked = await q(`select contact_id from public.inquiries where id = '${id(8)}'`)
ok(linked.length === 1 && linked[0].contact_id === null, 'an inquiry linked to an erased contact survives with no contact', JSON.stringify(linked))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
