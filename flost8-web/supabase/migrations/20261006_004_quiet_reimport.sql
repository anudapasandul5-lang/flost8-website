-- The 15-minute sheet importer upserts every row each run. An upsert that changes nothing still fires
-- UPDATE triggers: it bumped inquiries.updated_at and wrote a "money" activity row for every money row
-- (~6,400 junk rows a day). suppress_redundant_updates_trigger skips an UPDATE whose new row equals the
-- old one. The a0_ prefix makes it run before the other BEFORE UPDATE triggers (they fire alphabetically).
create trigger a0_suppress_redundant before update on public.inquiries
  for each row execute function suppress_redundant_updates_trigger();
create trigger a0_suppress_redundant before update on public.inquiry_money
  for each row execute function suppress_redundant_updates_trigger();

-- one-off cleanup: keep the first importer-written money activity row per inquiry, drop the repeats
delete from public.activity a
 using (select id, row_number() over (partition by inquiry_id order by id) as rn
          from public.activity where kind = 'money' and actor_id is null) d
 where a.id = d.id and d.rn > 1;
