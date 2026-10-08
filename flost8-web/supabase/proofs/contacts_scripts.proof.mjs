// Run: npm i --no-save @electric-sql/pglite && node supabase/proofs/contacts_scripts.proof.mjs
// Seed script, cutover script and intake linking, run against migrations 001-010 in an in-memory Postgres. No live database.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
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
for (const f of readdirSync(join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort()) await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'))

let pass = 0, fail = 0
const ok = (cond, name, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`) }
const q = async (sql, params) => (await db.query(sql, params)).rows
const run = async (path, commit) => {
  let sql = readFileSync(join(root, path), 'utf8')
  if (commit) sql = sql.replace(/\nrollback;\s*$/, '\ncommit;\n')
  const results = await db.exec(sql)
  return results.filter((r) => r.rows?.length).map((r) => r.rows)
}

await db.exec(`
  update public.managers set email = 'kasuni@x.test' where name = 'Kasuni';
  update public.managers set email = 'nirbheeth@x.test' where name = 'Nirbheeth';
  insert into auth.users (email, email_confirmed_at) values ('kasuni@x.test', now()), ('nirbheeth@x.test', now());
`)
const [K] = await q(`select id from public.managers where name = 'Kasuni'`)
const [N] = await q(`select id from public.managers where name = 'Nirbheeth'`)

// 8 inquiries: 3 spellings of one person, a phone on one of them, a no-name row, a spam row, a website row, two sheet rows by someone else
await db.exec(`
  insert into public.inquiries (id, source, status, event_name, event_date, organizer_name, organizer_phone, organizer_email, city, brand, sheet_key, updated_at, created_at) values
   ('00000000-0000-0000-0000-000000000001','sheet_import','booking_confirmed','A','2026-05-01','Ruwan Perera',null,null,'Colombo','Club X','k|1','2026-01-01','2026-01-01'),
   ('00000000-0000-0000-0000-000000000002','sheet_import','booking_confirmed','B','2026-08-01','  ruwan   PERERA ','077 123 4567','R@Club.test','Kandy',null,'k|2','2026-01-01','2026-01-01'),
   ('00000000-0000-0000-0000-000000000003','website','new','C','2026-12-01','Ruwan Perera','+94 77 123 4567','r@club.test',null,null,null,'2026-01-01','2026-01-01'),
   ('00000000-0000-0000-0000-000000000004','sheet_import','quoted','D','2026-09-01','Nimali',null,null,'Galle',null,'n|1','2026-01-01','2026-01-01'),
   ('00000000-0000-0000-0000-000000000005','sheet_import','new','E','2026-09-02',null,null,null,null,null,'n|2','2026-01-01','2026-01-01'),
   ('00000000-0000-0000-0000-000000000006','website','spam','F','2026-09-03','Casino Bot',null,null,null,null,null,'2026-01-01','2026-01-01'),
   ('00000000-0000-0000-0000-000000000007','sheet_import','lost','G','2026-02-03','Nimali','abc',null,null,null,'n|3','2026-01-01','2026-01-01');
  insert into public.inquiry_artists values ('00000000-0000-0000-0000-000000000001',1,'sonal'),('00000000-0000-0000-0000-000000000002',1,'sonal'),
     ('00000000-0000-0000-0000-000000000003',1,'anush'),('00000000-0000-0000-0000-000000000004',1,'anush');
  update public.inquiries set updated_at = '2026-01-01';
`)
const stamp = async () => JSON.stringify(await q(`select id, updated_at from public.inquiries order by id`))
const before = await stamp()

// ---------- seed: dry run, then real ----------
await run('scripts/010_seed_contacts.sql', false)
ok((await q(`select count(*)::int n from public.contacts`))[0].n === 0, 'seed dry run saves nothing')
const rep = await run('scripts/010_seed_contacts.sql', true)
const report = rep[0][0]
ok(Number(report.contacts_created) === 2 && Number(report.inquiries_linked) === 5, 'seed: 2 contacts, 5 inquiries linked', JSON.stringify(report))
const contacts = await q(`select * from public.contacts order by name`)
const ruwan = contacts.find((c) => c.name === 'Ruwan Perera')
ok(!!ruwan, 'seed: the three spellings became ONE contact named from the most recent inquiry', JSON.stringify(contacts.map((c) => c.name)))
ok(ruwan.phones.length === 1, 'seed: the same number in two spellings is stored once', JSON.stringify(ruwan?.phones))
ok(JSON.stringify(ruwan.emails) === JSON.stringify(['r@club.test']), 'seed: emails lower-cased and de-duplicated', JSON.stringify(ruwan?.emails))
ok(ruwan.organisation === 'Club X' && ruwan.city === 'Kandy', 'seed: organisation from brand, city from the most recent inquiry', `${ruwan?.organisation} ${ruwan?.city}`)
ok(ruwan.owner_id === N.id, "seed: owner is the manager of the most recent inquiry's first artist (Nirbheeth via the Anush website row)", String(ruwan?.owner_id))
ok(ruwan.types[0] === 'client', 'seed: tagged client')
const nimali = contacts.find((c) => c.name === 'Nimali')
ok(nimali.phones.length === 0, 'seed: a junk phone ("abc") is ignored')
const linked = await q(`select id, contact_id, status from public.inquiries order by id`)
ok(linked.filter((r) => r.contact_id === ruwan.id).length === 3 && linked.filter((r) => r.contact_id === nimali.id).length === 2, 'seed: every inquiry points at its person, lost ones included')
ok(linked[4].contact_id === null && linked[5].contact_id === null, 'seed: the no-name row and the spam row stay unlinked')
ok((await stamp()) === before, 'seed: no inquiries.updated_at moved')
const again = await run('scripts/010_seed_contacts.sql', true)
ok(Number(again[0][0].contacts_created) === 0 && (await q(`select count(*)::int n from public.contacts`))[0].n === 2, 'seed: running it again creates nothing')

// a new inquiry for an existing name joins the existing contact instead of making a twin
await db.exec(`insert into public.inquiries (id, source, status, event_name, organizer_name) values ('00000000-0000-0000-0000-000000000008','manual','new','H','RUWAN perera')`)
await run('scripts/010_seed_contacts.sql', true)
ok((await q(`select contact_id from public.inquiries where id = '00000000-0000-0000-0000-000000000008'`))[0].contact_id === ruwan.id && (await q(`select count(*)::int n from public.contacts`))[0].n === 2, 'seed: a later inquiry with a known name joins that contact')
await db.exec(`delete from public.inquiries where id = '00000000-0000-0000-0000-000000000008'`)

// ---------- intake linking ----------
const phoneMatch = (await q(`select public.link_intake_contact('00000000-0000-0000-0000-000000000003') as id`))[0].id
ok(phoneMatch === ruwan.id, 'intake: already-linked inquiry returns its contact')
await db.exec(`insert into public.inquiries (id, source, status, event_name, organizer_name, organizer_phone, organizer_email) values ('00000000-0000-0000-0000-000000000009','website','new','W1','Someone Else','0771234567',null)`)
ok((await q(`select public.link_intake_contact('00000000-0000-0000-0000-000000000009') as id`))[0].id === ruwan.id, 'intake: same phone in another spelling links to the existing contact')
await db.exec(`insert into public.inquiries (id, source, status, event_name, organizer_name, organizer_phone, organizer_email) values ('00000000-0000-0000-0000-00000000000a','website','new','W2','Different Name',null,'R@CLUB.test')`)
ok((await q(`select public.link_intake_contact('00000000-0000-0000-0000-00000000000a') as id`))[0].id === ruwan.id, 'intake: same email (any case) links to the existing contact')
await db.exec(`insert into public.inquiries (id, source, status, event_name, organizer_name, organizer_phone, organizer_email, city) values ('00000000-0000-0000-0000-00000000000b','website','new','W3','Brand New','0719998888','new@x.test','Matara')`)
const made = (await q(`select public.link_intake_contact('00000000-0000-0000-0000-00000000000b') as id`))[0].id
const newc = (await q(`select * from public.contacts where id = $1`, [made]))[0]
ok(newc && newc.name === 'Brand New' && newc.phones[0] === '0719998888' && newc.emails[0] === 'new@x.test' && newc.city === 'Matara', 'intake: an unknown person becomes a new contact with their details')
await db.exec(`insert into public.inquiries (id, source, status, event_name) values ('00000000-0000-0000-0000-00000000000c','website','new','W4')`)
ok((await q(`select public.link_intake_contact('00000000-0000-0000-0000-00000000000c') as id`))[0].id === null, 'intake: an enquiry with no name, phone or email links nothing and does not fail')
await db.exec(`reset role; set role authenticated`)
let denied = false
try { await db.query(`select public.link_intake_contact('00000000-0000-0000-0000-00000000000c')`) } catch { denied = true }
ok(denied, 'intake: signed-in users cannot call the intake function')
await db.exec(`reset role`)
await db.exec(`delete from public.inquiries where id in ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c')`)

// ---------- cutover ----------
await db.exec(`update public.inquiries set updated_at = '2026-01-01'`)
const before2 = await stamp()
await run('scripts/011_cutover_convert_sheet_rows.sql', false)
ok((await q(`select count(*)::int n from public.inquiries where source = 'sheet_import'`))[0].n === 5, 'cutover dry run changes nothing')
const cut = await run('scripts/011_cutover_convert_sheet_rows.sql', true)
const cr = cut[0][0]
ok(Number(cr.converted) === 5 && Number(cr.sheet_rows_left) === 0 && Number(cr.held_back_from_website) === 5 && Number(cr.total_before) === Number(cr.total_after), 'cutover: 5 sheet rows converted, all held back, row count unchanged', JSON.stringify(cr))
ok((await q(`select count(*)::int n from public.inquiries where source = 'website' and no_auto_publish`))[0].n === 0, 'cutover: website enquiries are NOT held back')
ok((await stamp()) === before2, 'cutover: no inquiries.updated_at moved (timers are not reset)')
ok((await q(`select tgenabled from pg_trigger where tgname = 'inquiries_touch'`))[0].tgenabled === 'O', 'cutover: the touch trigger is switched back on')
const lk = await q(`select count(*)::int n from public.inquiries where source = 'manual' and contact_id is not null`)
ok(lk[0].n >= 4, 'cutover: converted rows keep their contact links', String(lk[0].n))

// converted rows are now editable by their owner, and the hold cannot be cleared by a manager
await db.exec(`reset role; select set_config('request.jwt.claim.sub', (select user_id::text from public.managers where name='Kasuni'), false), set_config('request.jwt.claim.role','authenticated',false); set role authenticated`)
await db.query(`update public.inquiries set notes = 'edited in app' where id = '00000000-0000-0000-0000-000000000001'`)
ok((await q(`select notes from public.inquiries where id = '00000000-0000-0000-0000-000000000001'`))[0].notes === 'edited in app', "cutover: a converted row is editable by the manager who owns it")
let blocked = false
try { await db.query(`update public.inquiries set no_auto_publish = false where id = '00000000-0000-0000-0000-000000000001'`) } catch { blocked = true }
ok(blocked, 'cutover: a manager cannot release the website hold')
await db.exec(`reset role`)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
