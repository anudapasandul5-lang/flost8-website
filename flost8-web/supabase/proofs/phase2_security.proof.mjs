// Run: npm i --no-save @electric-sql/pglite && node supabase/proofs/phase2_security.proof.mjs
// Attacker-view proof of the whole migration chain (001 onwards) in an in-memory Postgres (PGlite). Touches no live database.
// Signs in as anon, as each sales manager and as the owner, and tries every route to data or functions they should not reach.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../migrations', import.meta.url))
const db = new PGlite()

// Supabase stubs, including its default privileges (new tables AND functions are granted to anon + authenticated).
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

// --- the chain applies cleanly, in order, with no duplicate objects ----------------------------------------------
let pass = 0, fail = 0
const ok = (cond, name, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`) }
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
const numbers = files.map((f) => Number(/_(\d{3})_/.exec(f)?.[1]))
ok(numbers.every((n, k) => n === k + 1), 'migration files are numbered 001..N with no gap or duplicate', numbers.join(','))
for (const f of files) {
  try { await db.exec(readFileSync(join(dir, f), 'utf8')) } catch (e) { ok(false, `migration ${f} applies`, e.message); process.exit(1) }
}
ok(true, `all ${files.length} migrations apply in order (${files[0]} .. ${files.at(-1)})`)

const q = async (sql, params) => (await db.query(sql, params)).rows
const as = async (uid, role = 'authenticated') => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false), set_config('request.jwt.claim.role', '${role}', false); set role ${role}`)
}
const su = async () => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', '', false)`)
const fails = async (sql, re, name) => {
  try { await db.query(sql); ok(false, name, 'expected an error, got none') } catch (e) { ok(re.test(e.message), name, e.message) }
}

// --- people + data ---------------------------------------------------------------------------------------------
await su()
await db.exec(`
  update public.managers set email = 'kasuni@x.test' where name = 'Kasuni';
  update public.managers set email = 'nirbheeth@x.test' where name = 'Nirbheeth';
  insert into public.managers (name, role, email) values ('Owner', 'owner', 'owner@x.test');
  insert into auth.users (email, email_confirmed_at) values ('kasuni@x.test', now()), ('nirbheeth@x.test', now()), ('owner@x.test', now());
`)
const ppl = Object.fromEntries((await q(`select name, user_id, id from public.managers`)).map((r) => [r.name, r]))
const K = ppl.Kasuni, N = ppl.Nirbheeth, O = ppl.Owner
const has012 = (await q(`select 1 from information_schema.columns where table_name = 'managers' and column_name = 'whatsapp'`)).length > 0
if (has012) await db.query(`update public.managers set whatsapp = '+10000000001' where id in ($1, $2)`, [K.id, N.id])

// One shared contact. Nirbheeth's artist (anush) has a booked show with it; Kasuni has nothing to do with that show.
const C = '00000000-0000-0000-0000-00000000c001'
const NS = '00000000-0000-0000-0000-0000000000e1' // Nirbheeth's booked show
const KS = '00000000-0000-0000-0000-0000000000e2' // Kasuni's sheet row
await db.exec(`
  insert into public.contacts (id, name) values ('${C}', 'Shared Venue');
  insert into public.inquiries (id, source, status, event_name, event_date, contact_id) values ('${NS}', 'manual', 'booking_confirmed', 'Secret show', current_date + 30, '${C}');
  insert into public.inquiry_artists values ('${NS}', 1, 'anush');
  insert into public.inquiry_money (inquiry_id, fee, advance, balance) values ('${NS}', 500000, 100000, 400000);
  insert into public.inquiries (id, source, status, event_name, event_date, sheet_key) values ('${KS}', 'sheet_import', 'quoted', 'Sheet row', current_date + 10, 'k|9');
  insert into public.inquiry_artists values ('${KS}', 1, 'sonal');
  insert into public.contacts (id, name, deleted_at) values ('00000000-0000-0000-0000-00000000c0de', 'Old trash', now() - interval '40 days');
`)

// --- (a) managers.whatsapp -------------------------------------------------------------------------------------
if (has012) {
  for (const [who, u] of [['manager', K.user_id], ['owner', O.user_id]]) {
    await as(u)
    await fails(`select whatsapp from public.managers`, /permission denied/, `${who}: whatsapp column is not selectable`)
    await fails(`select to_jsonb(m) from public.managers m`, /permission denied/, `${who}: whole-row read of managers is refused`)
    await fails(`select i.id, (select m.whatsapp from public.managers m where m.id = i.owner_id) from public.inquiries i`, /permission denied/, `${who}: embedding managers.whatsapp under inquiries is refused`)
    await fails(`select id from public.managers order by whatsapp`, /permission denied/, `${who}: ordering by whatsapp is refused`)
  }
  await as(K.user_id)
  await fails(`select * from public.manager_whatsapps()`, /owner only/, 'manager: manager_whatsapps() refused')
  // views / functions that could expose the column
  await su()
  const views = await q(`select table_name from information_schema.views where table_schema = 'public' and view_definition ilike '%whatsapp%'`)
  ok(views.every((v) => v.table_name !== 'managers'), 'no public view re-exposes managers.whatsapp', JSON.stringify(views))
  const fns = await q(`select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and (p.prosrc ilike '%public.managers%' and p.prosrc ilike '%whatsapp%')`)
  ok(fns.map((f) => f.proname).sort().join() === 'manager_whatsapps,set_manager_whatsapp', 'only the two owner-only functions touch managers.whatsapp', JSON.stringify(fns))
}

// --- (b) sheet rows: only contact link + snooze ------------------------------------------------------------------
await as(K.user_id)
const editable = []
await su()
const cols = (await q(`select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'inquiries' order by ordinal_position`))
for (const c of cols) {
  const v = c.data_type === 'boolean' ? 'not coalesce(' + c.column_name + ', false)'
    : c.data_type === 'uuid' ? (c.column_name === 'contact_id' ? `'${C}'::uuid` : `'${N.id}'::uuid`)
    : c.data_type === 'date' ? `current_date + 99`
    : c.data_type.startsWith('timestamp') ? `now() - interval '9 days'`
    : c.data_type === 'numeric' ? '7'
    : c.data_type === 'jsonb' ? `'{"x":1}'::jsonb`
    : c.column_name === 'status' ? `'lost'` : c.column_name === 'source' ? `'manual'`
    : c.column_name.endsWith('url') || c.column_name === 'ticket_link' ? `'https://x.test/a'` : c.column_name === 'organizer_email' ? `'a@x.test'` : `'x'`
  await su()
  await db.exec('begin')
  await as(K.user_id)
  try {
    const r = await q(`update public.inquiries set ${c.column_name} = ${v} where id = '${KS}' returning id`)
    if (r.length) editable.push(c.column_name)
  } catch { /* refused */ }
  await db.exec('rollback')
  await su()
}
const expected = has012 ? 'contact_id,snoozed_until' : 'contact_id'
ok(editable.sort().join() === expected, `manager can change only ${expected} on their own sheet row`, editable.join())

// --- (c) owner-only and service-only functions ----------------------------------------------------------------
const ownerOnly = [
  [`select public.set_inquiry_publish_hold('${NS}', true)`, 'set_inquiry_publish_hold'],
  [`select public.purge_old_contacts()`, 'purge_old_contacts'],
  [`select public.link_intake_contact('${NS}')`, 'link_intake_contact'],
  ...(has012 ? [[`select * from public.manager_whatsapps()`, 'manager_whatsapps'], [`select public.set_manager_whatsapp('${K.id}', '+10000000009')`, 'set_manager_whatsapp']] : []),
]
for (const [sql, name] of ownerOnly) {
  await su(); await db.exec('begin')
  await as(null, 'anon')
  await fails(sql, /permission denied|owner only|not allowed/, `anon cannot call ${name}`)
  await db.exec('rollback'); await su(); await db.exec('begin')
  await as(K.user_id)
  await fails(sql, /permission denied|owner only|not allowed/, `a sales manager cannot call ${name}`)
  await db.exec('rollback'); await su()
}
await su()
ok((await q(`select count(*)::int n from public.contacts where name = 'Old trash'`))[0].n === 1, 'the 40-day-old Trash contact is still there after the managers tried to purge')
// anon can call nothing in public at all
const anonFns = await q(`select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute') and p.prorettype <> 'trigger'::regtype`)
ok(anonFns.length === 0, 'anon can execute no public function', anonFns.map((f) => f.proname).join())
// the full list of functions a signed-in user may execute, so a new one cannot slip in unnoticed
const authFns = (await q(`select distinct p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and has_function_privilege('authenticated', p.oid, 'execute') and p.prorettype <> 'trigger'::regtype order by 1`)).map((r) => r.proname)
const allowedAuth = ['can_edit', 'can_see_money', 'can_view', 'contact_stats', 'current_manager_id', 'is_manager', 'is_owner', 'manager_whatsapps', 'merge_contacts', 'set_inquiry_contact', 'set_inquiry_publish_hold', 'set_manager_whatsapp', 'take_over_sheet_inquiry', 'undo_merge']
const extra = authFns.filter((f) => !allowedAuth.includes(f))
ok(extra.length === 0, 'signed-in users can execute only the expected functions', extra.join())

// --- (d) nothing leaks another manager's inquiries or money ------------------------------------------------------
await as(K.user_id)
ok((await q(`select id from public.inquiries where id = '${NS}'`)).length === 0, "Kasuni cannot see Nirbheeth's show (baseline RLS)")
ok((await q(`select inquiry_id from public.inquiry_money where inquiry_id = '${NS}'`)).length === 0, "Kasuni cannot see its money")
{
  const s = (await q(`select * from public.contact_stats(current_date)`)).find((r) => r.contact_id === C)
  ok(!s || (s.any_count === 0 && s.booked_count === 0 && s.next_booked_date === null && s.last_inquiry_touch === null),
    "contact_stats does not reveal Nirbheeth's show to Kasuni (count, booked date or last touch)", JSON.stringify(s))
}
await as(N.user_id)
{
  const s = (await q(`select * from public.contact_stats(current_date)`)).find((r) => r.contact_id === C)
  ok(s && s.any_count === 1 && s.booked_count === 1 && s.next_booked_date !== null, 'contact_stats still counts the show for its own manager', JSON.stringify(s))
}
await as(O.user_id)
{
  const s = (await q(`select * from public.contact_stats(current_date)`)).find((r) => r.contact_id === C)
  ok(s && s.any_count === 1 && s.booked_count === 1, 'contact_stats counts it for the owner', JSON.stringify(s))
}
await as(null, 'anon')
await fails(`select * from public.contact_stats(current_date)`, /permission denied/, 'anon cannot call contact_stats')
if (has012) {
  await as(K.user_id)
  ok((await q(`update public.inquiries set snoozed_until = current_date + 3 where id = '${NS}' returning id`)).length === 0, "Kasuni cannot snooze Nirbheeth's show")
}
await as(K.user_id)
await fails(`select public.set_inquiry_contact('${NS}', null)`, /not allowed/, "Kasuni cannot relink Nirbheeth's show to a contact")
// bulk-update path is plain update ... where id in (...): RLS filters out the rows that are not hers
ok((await q(`update public.inquiries set status = 'spam' where id in ('${NS}') returning id`)).length === 0, "bulk Mark spam cannot touch Nirbheeth's show")
await su()
ok((await q(`select status from public.inquiries where id = '${NS}'`))[0].status === 'booking_confirmed', "Nirbheeth's show is unchanged")

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
