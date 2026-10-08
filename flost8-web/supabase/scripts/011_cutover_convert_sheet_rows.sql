-- FLOST8 /manage CUTOVER: turn the imported sheet rows into normal, editable app events. NOT RUN.
-- Run in the Supabase SQL editor (as postgres), once, AFTER all of this is true:
--   1. Contacts have been live for about a week and the team is using them.
--   2. The 15-minute sheet importer is SWITCHED OFF in Apps Script (delete its trigger). If it is still on, it will
--      overwrite these rows on its next run, because it upserts on sheet_key.
--   3. Kasuni and Nirbheeth know they now add everything in the app, and the sheets are an archive.
--   4. contacts have been seeded (010_seed_contacts.sql) so converted events already point at contacts.
--
-- What it does:
--   * source 'sheet_import' -> 'manual' ("Added in app"), so the rows become editable and deletable like app events
--   * no_auto_publish = true on every converted row: NONE of them will auto-publish to the public Upcoming Shows list.
--     The owner can release one at a time from the event drawer ("Release to website").
--   * leaves updated_at alone, so "quiet for N days" flags do not all reset at once
--   * sheet_key stays on the row (harmless once the importer is off)
--
-- It does NOT touch the website's Shows sheet. The rows already on the public list (including the 'sync:' ones written by
-- sync.gs) stay exactly as they are. Decide separately whether to leave sync.gs running against the frozen sheets or
-- turn it off; either way, edits made in the app to a converted event do not reach the website unless the owner releases it.
--
-- DRY RUN BY DEFAULT: the last line is ROLLBACK. Read the report, then change it to COMMIT.

begin;

-- Refuse to run while the importer still looks active.
do $$
begin
  if exists (select 1 from public.inquiries where source = 'sheet_import' and updated_at > now() - interval '30 minutes') then
    raise exception 'A sheet row changed in the last 30 minutes. Is the importer still switched on? Turn it off first.';
  end if;
end $$;

create temp table cutover_before on commit drop as
select count(*) filter (where source = 'sheet_import') as sheet_rows,
       count(*) filter (where source = 'manual')       as manual_rows,
       count(*) filter (where source = 'website')      as website_rows,
       count(*)                                         as all_rows
  from public.inquiries;

-- Do not bump updated_at: the touch trigger would reset every needs-action timer.
alter table public.inquiries disable trigger inquiries_touch;

update public.inquiries
   set source = 'manual', no_auto_publish = true
 where source = 'sheet_import';

alter table public.inquiries enable trigger inquiries_touch;

-- ---------- report ----------
select b.sheet_rows as converted, b.all_rows as total_before,
       (select count(*) from public.inquiries) as total_after,
       (select count(*) from public.inquiries where source = 'sheet_import') as sheet_rows_left,
       (select count(*) from public.inquiries where no_auto_publish) as held_back_from_website,
       (select count(*) from public.inquiries where no_auto_publish and website_show_id is not null) as held_but_already_published
  from cutover_before b;

-- DRY RUN: change ROLLBACK to COMMIT to keep it.
rollback;
