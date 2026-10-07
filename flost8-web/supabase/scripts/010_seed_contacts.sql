-- FLOST8 /manage: seed contacts from existing inquiries. Run in the Supabase SQL editor AFTER migration 010 is applied.
-- NOT RUN. Safe to run more than once: inquiries that already have a contact are skipped, and a name that matches an
-- existing active contact is linked to it instead of making a second one.
--
-- DRY RUN BY DEFAULT: the last line is ROLLBACK, so you see the report and nothing is saved. Read the report, then change
-- the last line to COMMIT and run it again.
--
-- What it does:
--   * one contact per distinct organizer_name (ignoring case and extra spaces), type "client"
--   * phones / emails collected from that person's inquiries (the ~68 sheet rows have a name only, so most start without)
--   * owner = the owner of their most recent inquiry (the manager of its first artist)
--   * organisation = most recent brand, city = most recent city
--   * links every one of that person's inquiries (sheet rows included; a contact link is the one edit imported rows allow)
--   * spam inquiries are left alone
-- It does not touch inquiries.updated_at, so no "quiet for N days" flag resets.

begin;

create temp table seed_src on commit drop as
select i.id as inquiry_id,
       lower(btrim(regexp_replace(i.organizer_name, '\s+', ' ', 'g'))) as key,
       btrim(regexp_replace(i.organizer_name, '\s+', ' ', 'g')) as display,
       i.organizer_phone, i.organizer_email, i.city, i.brand, i.owner_id, i.event_date, i.created_at
  from public.inquiries i
 where i.contact_id is null
   and i.status <> 'spam'
   and nullif(btrim(coalesce(i.organizer_name, '')), '') is not null;

-- keys that already have an active contact are only linked, never duplicated
create temp table seed_map on commit drop as
select k.key,
       (select c.id from public.contacts c
         where c.deleted_at is null and lower(btrim(regexp_replace(c.name, '\s+', ' ', 'g'))) = k.key
         order by c.created_at limit 1) as existing_id,
       gen_random_uuid() as new_id
  from (select distinct key from seed_src) k;

insert into public.contacts (id, name, types, phones, emails, organisation, city, owner_id)
select m.new_id,
       left((select s.display from seed_src s where s.key = m.key order by s.event_date desc nulls last, s.created_at desc limit 1), 200),
       '{client}',
       (array(select q.ph from (
           select distinct on (d) left(btrim(s.organizer_phone), 40) as ph,
                  right(regexp_replace(s.organizer_phone, '\D', '', 'g'), 9) as d
             from seed_src s
            where s.key = m.key and length(regexp_replace(coalesce(s.organizer_phone, ''), '\D', '', 'g')) >= 7
            order by d, s.event_date desc nulls last, s.created_at desc) q))[1:10],
       (array(select distinct lower(btrim(s.organizer_email)) from seed_src s
               where s.key = m.key and s.organizer_email like '%@%' and length(s.organizer_email) <= 254))[1:10],
       left((select s.brand from seed_src s where s.key = m.key and nullif(btrim(coalesce(s.brand, '')), '') is not null
              order by s.event_date desc nulls last, s.created_at desc limit 1), 200),
       left((select s.city from seed_src s where s.key = m.key and nullif(btrim(coalesce(s.city, '')), '') is not null
              order by s.event_date desc nulls last, s.created_at desc limit 1), 100),
       (select s.owner_id from seed_src s where s.key = m.key and s.owner_id is not null
         order by s.event_date desc nulls last, s.created_at desc limit 1)
  from seed_map m
 where m.existing_id is null;

update public.inquiries i
   set contact_id = coalesce(m.existing_id, m.new_id)
  from seed_src s
  join seed_map m on m.key = s.key
 where i.id = s.inquiry_id;

-- ---------- report (read this before changing ROLLBACK to COMMIT) ----------
select
  (select count(*) from seed_map where existing_id is null)                              as contacts_created,
  (select count(*) from seed_map where existing_id is not null)                          as joined_to_existing_contact,
  (select count(*) from seed_src)                                                        as inquiries_linked,
  (select count(*) from public.inquiries where contact_id is null and status <> 'spam')  as inquiries_still_unlinked_no_name,
  (select count(*) from public.contacts c where c.id in (select new_id from seed_map) and cardinality(c.phones) > 0) as new_contacts_with_a_phone,
  (select count(*) from public.contacts c where c.id in (select new_id from seed_map) and c.owner_id is null)        as new_contacts_without_owner;

-- The 25 contacts with the most bookings, to eyeball for near-duplicates ("Ruwan" vs "Ruwan P").
select c.name, c.owner_id, count(i.id) as inquiries
  from public.contacts c join public.inquiries i on i.contact_id = c.id
 group by c.id, c.name, c.owner_id
 order by inquiries desc, c.name
 limit 25;

-- DRY RUN: change ROLLBACK to COMMIT to keep it.
rollback;
