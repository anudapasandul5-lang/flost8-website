-- FLOST8 /manage: contacts (mini-CRM). NOT APPLIED. Apply BEFORE deploying the app build that reads inquiries.contact_id.
-- Spec: Projects/FLOST8/plans/manage-contacts-crm.md (grilled with Anuda, 2026-10-07).
--
-- Rules carried here:
--   * one contact record per person/org, with type tags; every signed-in manager sees all contacts
--   * everyone adds / edits / soft-deletes; nothing is ever hard-deleted by a user (Trash keeps 30 days)
--   * merges are logged with a full snapshot and can be undone
--   * linking a contact to an inquiry is not a "touch": it never bumps inquiries.updated_at, and it is the ONE change
--     allowed on a read-only sheet_import row (so seeding / merging can link the ~68 imported rows)
--   * converted sheet rows can be held back from auto-publish (inquiries.no_auto_publish); only the owner role can clear it
-- Additive only: no column is dropped, no existing policy is loosened except the two trigger functions replaced below.

begin;

-- ---------- contacts ----------
create table public.contacts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  types        text[] not null default '{}',
  phones       text[] not null default '{}',
  whatsapp     text,
  emails       text[] not null default '{}',
  organisation text,
  city         text,
  instagram    text,
  language     text,
  owner_id     uuid references public.managers (id),
  notes        text,
  created_by   uuid references public.managers (id) default public.current_manager_id(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  deleted_by   uuid references public.managers (id),
  merged_into  uuid references public.contacts (id) on delete set null,
  constraint contacts_name_len  check (length(btrim(name)) between 1 and 200),
  constraint contacts_types_ok  check (types <@ array['client','venue','promoter','artist','supplier','sponsor']),
  constraint contacts_list_len  check (cardinality(phones) <= 10 and cardinality(emails) <= 10),
  constraint contacts_text_len  check (
    coalesce(length(notes), 0) <= 10000 and coalesce(length(organisation), 0) <= 200 and coalesce(length(city), 0) <= 100
    and coalesce(length(whatsapp), 0) <= 40 and coalesce(length(language), 0) <= 30),
  constraint contacts_instagram_ok check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$')
);
create index contacts_owner_idx   on public.contacts (owner_id);
create index contacts_name_idx    on public.contacts (lower(name));
create index contacts_deleted_idx on public.contacts (deleted_at);

create table public.contact_history (
  id         bigint generated always as identity primary key,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  actor_id   uuid references public.managers (id),
  kind       text not null,                       -- created | edited | deleted | restored | merged | merged_away | merge_undone
  data       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index contact_history_contact_idx on public.contact_history (contact_id, created_at);

create table public.contact_notes (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  author_id  uuid references public.managers (id) default public.current_manager_id(),
  kind       text not null default 'note' check (kind in ('note', 'call', 'whatsapp', 'email', 'meeting')),
  body       text not null check (length(btrim(body)) between 1 and 5000),
  inquiry_id uuid references public.inquiries (id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_notes_contact_idx on public.contact_notes (contact_id, created_at desc);

create table public.message_templates (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (length(btrim(title)) between 1 and 80),
  language   text not null default 'English' check (length(btrim(language)) between 1 and 30),
  body       text not null check (length(btrim(body)) between 1 and 2000),
  archived   boolean not null default false,
  created_by uuid references public.managers (id) default public.current_manager_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- links on existing tables ----------
alter table public.inquiries add column contact_id uuid references public.contacts (id) on delete set null;
create index inquiries_contact_idx on public.inquiries (contact_id);
alter table public.inquiries add column no_auto_publish boolean not null default false;

-- reminders can now belong to a contact instead of an inquiry
alter table public.reminders alter column inquiry_id drop not null;
alter table public.reminders add column contact_id uuid references public.contacts (id) on delete cascade;
alter table public.reminders add column created_at timestamptz not null default now();
alter table public.reminders add column done_at timestamptz;
alter table public.reminders add constraint reminders_target check (inquiry_id is not null or contact_id is not null);
alter table public.reminders add constraint reminders_note_len check (coalesce(length(note), 0) <= 1000);
create index reminders_contact_idx on public.reminders (contact_id);

-- ---------- triggers ----------
-- A contact link is not a touch: seeding or merging must not reset the "quiet for N days" timers on inquiries.
create or replace function public.touch_updated_at() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    if (to_jsonb(new) - array['updated_at', 'contact_id']) = (to_jsonb(old) - array['updated_at', 'contact_id']) then
      return new;
    end if;
    new.updated_at = now();
    return new;
  end $$;

-- Same as migration 003, plus: the one allowed edit to an imported row is its contact link.
create or replace function public.protect_sheet_rows() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    if auth.uid() is not null then
      if old.source = 'sheet_import'
         and (to_jsonb(new) - 'contact_id') is distinct from (to_jsonb(old) - 'contact_id') then
        raise exception 'imported rows are read-only until the cutover' using errcode = '42501';
      end if;
      if new.owner_id is distinct from old.owner_id and old.owner_id is not null and not public.is_owner() then
        raise exception 'only the owner role can reassign an inquiry' using errcode = '42501';
      end if;
    end if;
    return new;
  end $$;

-- no_auto_publish is set by the cutover script (SQL editor / service role) and cleared by the owner through
-- set_inquiry_publish_hold(). A direct client write is refused; the security-definer function runs as its owner, not 'authenticated'.
create function public.guard_no_auto_publish() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    if current_user in ('anon', 'authenticated') and
       ((tg_op = 'INSERT' and new.no_auto_publish) or (tg_op = 'UPDATE' and new.no_auto_publish is distinct from old.no_auto_publish)) then
      raise exception 'no_auto_publish is server-controlled' using errcode = '42501';
    end if;
    return new;
  end $$;
create trigger inquiries_guard_no_auto_publish before insert or update on public.inquiries
  for each row execute function public.guard_no_auto_publish();

create function public.contacts_guard() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    if tg_op = 'UPDATE' then
      if current_user in ('anon', 'authenticated') and
         (new.id, new.created_at, new.created_by, new.merged_into) is distinct from (old.id, old.created_at, old.created_by, old.merged_into) then
        raise exception 'contact identity columns are read-only' using errcode = '42501';
      end if;
      new.updated_at = now();
    elsif current_user in ('anon', 'authenticated') and (new.deleted_at is not null or new.merged_into is not null) then
      raise exception 'a contact cannot be created already deleted' using errcode = '42501';
    end if;
    return new;
  end $$;
create trigger contacts_guard before insert or update on public.contacts
  for each row execute function public.contacts_guard();

create function public.log_contact_change() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  declare
    me   uuid := public.current_manager_id();
    diff jsonb;
    kind text;
  begin
    if tg_op = 'INSERT' then
      insert into public.contact_history (contact_id, actor_id, kind, data) values (new.id, me, 'created', '{}');
      return new;
    end if;
    -- notes are logged as "changed" only, not copied into history
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)), '{}')
      into diff
      from jsonb_each(to_jsonb(new) - array['updated_at', 'deleted_at', 'deleted_by', 'merged_into', 'notes']) n
      join jsonb_each(to_jsonb(old) - array['updated_at', 'deleted_at', 'deleted_by', 'merged_into', 'notes']) o using (key)
     where n.value is distinct from o.value;
    if new.notes is distinct from old.notes then diff := diff || '{"notes": {"changed": true}}'; end if;
    if old.deleted_at is null and new.deleted_at is not null then
      kind := case when new.merged_into is not null then 'merged_away' else 'deleted' end;
      insert into public.contact_history (contact_id, actor_id, kind, data)
        values (new.id, me, kind, jsonb_build_object('merged_into', new.merged_into));
    elsif old.deleted_at is not null and new.deleted_at is null then
      insert into public.contact_history (contact_id, actor_id, kind, data) values (new.id, me, 'restored', '{}');
    end if;
    if diff <> '{}'::jsonb then
      insert into public.contact_history (contact_id, actor_id, kind, data) values (new.id, me, 'edited', diff);
    end if;
    return new;
  end $$;
create trigger log_contact_change after insert or update on public.contacts
  for each row execute function public.log_contact_change();

create function public.touch_message_template() returns trigger
  language plpgsql set search_path = ''
  as $$ begin new.updated_at = now(); return new; end $$;
create trigger message_templates_touch before update on public.message_templates
  for each row execute function public.touch_message_template();

-- ---------- row level security ----------
alter table public.contacts          enable row level security;
alter table public.contact_history   enable row level security;
alter table public.contact_notes     enable row level security;
alter table public.message_templates enable row level security;

-- everyone who can sign in sees every contact (deleted ones too: the Trash view reads them); nobody hard-deletes
create policy contacts_read   on public.contacts for select to authenticated using (public.is_manager());
create policy contacts_insert on public.contacts for insert to authenticated with check (public.is_manager());
create policy contacts_update on public.contacts for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy contact_history_read on public.contact_history for select to authenticated using (public.is_manager());

create policy contact_notes_read   on public.contact_notes for select to authenticated using (public.is_manager());
create policy contact_notes_insert on public.contact_notes for insert to authenticated
  with check (public.is_manager() and author_id = public.current_manager_id() and (inquiry_id is null or public.can_view(inquiry_id)));
create policy contact_notes_delete on public.contact_notes for delete to authenticated
  using (author_id = public.current_manager_id() or public.is_owner());

create policy message_templates_all on public.message_templates for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- ---------- privileges ----------
revoke all on public.contacts, public.contact_history, public.contact_notes, public.message_templates from anon, authenticated;
grant select, insert, update          on public.contacts          to authenticated;
grant select                          on public.contact_history   to authenticated;
grant select, insert, delete          on public.contact_notes     to authenticated;
grant select, insert, update, delete  on public.message_templates to authenticated;
grant all on public.contacts, public.contact_history, public.contact_notes, public.message_templates to service_role;

-- ---------- functions (security definer: they act on rows the caller's own RLS would not let them touch) ----------

-- Dates and counts only, never money. p_today is the viewer's local date so "upcoming" means upcoming where they are.
create function public.contact_stats(p_today date)
returns table (contact_id uuid, any_count int, booked_count int, next_booked_date date, last_booked_date date,
               last_inquiry_touch timestamptz, last_note_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id,
         count(i.id) filter (where i.status not in ('lost', 'spam'))::int,
         count(i.id) filter (where i.status in ('booking_confirmed', 'deposit_paid'))::int,
         min(i.event_date) filter (where i.status in ('booking_confirmed', 'deposit_paid') and i.event_date >= p_today),
         max(i.event_date) filter (where i.status in ('booking_confirmed', 'deposit_paid') and i.event_date < p_today),
         max(i.updated_at),
         (select max(n.created_at) from public.contact_notes n where n.contact_id = c.id)
    from public.contacts c
    left join public.inquiries i on i.contact_id = c.id
   where public.is_manager() and c.deleted_at is null
   group by c.id
$$;

-- Points one inquiry at a contact (or none). Works on imported rows too: the contact link is the one edit they allow.
create function public.set_inquiry_contact(p_inquiry uuid, p_contact uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_manager() then raise exception 'not allowed' using errcode = '42501'; end if;
  if not public.can_view(p_inquiry) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_contact is not null and not exists (select 1 from public.contacts where id = p_contact and deleted_at is null) then
    raise exception 'contact not found';
  end if;
  update public.inquiries set contact_id = p_contact where id = p_inquiry;
end $$;

-- Owner role only: hold an event back from auto-publish, or release it.
create function public.set_inquiry_publish_hold(p_inquiry uuid, p_hold boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  update public.inquiries set no_auto_publish = p_hold where id = p_inquiry;
end $$;

-- Merge p_merge into p_keep. Moves inquiries, notes and reminders, unions the lists, fills blanks, then soft-deletes the
-- merged contacts. Everything needed to undo is stored on the kept contact's history row.
create function public.merge_contacts(p_keep uuid, p_merge uuid[], p_fields jsonb default '{}')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  me       uuid := public.current_manager_id();
  k        public.contacts;
  m        public.contacts;
  before   jsonb;
  snap     jsonb := '[]';
  inq      uuid[];
  nts      uuid[];
  rem      uuid[];
  merged_n int := 0;
  t        text[];
  ph       text[];
  em       text[];
  nt       text;
begin
  if me is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_merge is null or cardinality(p_merge) = 0 then raise exception 'nothing to merge'; end if;
  if p_keep = any (p_merge) then raise exception 'cannot merge a contact into itself'; end if;
  select * into k from public.contacts where id = p_keep and deleted_at is null for update;
  if not found then raise exception 'contact to keep not found'; end if;
  before := to_jsonb(k);
  t := k.types; ph := k.phones; em := k.emails; nt := k.notes;

  for m in select * from public.contacts where id = any (p_merge) and deleted_at is null order by created_at for update loop
    select coalesce(array_agg(id), '{}') into inq from public.inquiries where contact_id = m.id;
    select coalesce(array_agg(id), '{}') into nts from public.contact_notes where contact_id = m.id;
    select coalesce(array_agg(id), '{}') into rem from public.reminders where contact_id = m.id;
    snap := snap || jsonb_build_array(jsonb_build_object('contact', to_jsonb(m), 'inquiries', to_jsonb(inq), 'notes', to_jsonb(nts), 'reminders', to_jsonb(rem)));
    update public.inquiries     set contact_id = p_keep where contact_id = m.id;
    update public.contact_notes set contact_id = p_keep where contact_id = m.id;
    update public.reminders     set contact_id = p_keep where contact_id = m.id;
    update public.contacts set deleted_at = now(), deleted_by = me, merged_into = p_keep where id = m.id;
    t  := array(select x from (select x, min(o) as o from unnest(t  || m.types)  with ordinality u(x, o) group by x) s order by o);
    ph := array(select x from (select x, min(o) as o from unnest(ph || m.phones) with ordinality u(x, o) group by x) s order by o);
    em := array(select x from (select x, min(o) as o from unnest(em || m.emails) with ordinality u(x, o) group by x) s order by o);
    k.whatsapp     := coalesce(k.whatsapp, m.whatsapp);
    k.organisation := coalesce(k.organisation, m.organisation);
    k.city         := coalesce(k.city, m.city);
    k.instagram    := coalesce(k.instagram, m.instagram);
    k.language     := coalesce(k.language, m.language);
    k.owner_id     := coalesce(k.owner_id, m.owner_id);
    if nullif(btrim(coalesce(m.notes, '')), '') is not null then
      nt := nullif(btrim(coalesce(nt, '') || E'\n\n[From ' || m.name || E'] ' || m.notes), '');
    end if;
    merged_n := merged_n + 1;
  end loop;
  if merged_n = 0 then raise exception 'nothing to merge'; end if;

  update public.contacts set
    name         = coalesce(nullif(btrim(p_fields ->> 'name'), ''), k.name),
    types        = t,
    phones       = ph[1:10],
    emails       = em[1:10],
    whatsapp     = coalesce(nullif(btrim(p_fields ->> 'whatsapp'), ''), k.whatsapp),
    organisation = coalesce(nullif(btrim(p_fields ->> 'organisation'), ''), k.organisation),
    city         = coalesce(nullif(btrim(p_fields ->> 'city'), ''), k.city),
    instagram    = coalesce(nullif(btrim(p_fields ->> 'instagram'), ''), k.instagram),
    language     = coalesce(nullif(btrim(p_fields ->> 'language'), ''), k.language),
    owner_id     = coalesce(nullif(p_fields ->> 'owner_id', '')::uuid, k.owner_id),
    notes        = left(nt, 10000)
  where id = p_keep;

  insert into public.contact_history (contact_id, actor_id, kind, data)
    values (p_keep, me, 'merged', jsonb_build_object('before', before, 'merged', snap));
  return p_keep;
end $$;

-- Undo a merge from its history row. Restores the merged contacts, puts back exactly the inquiries / notes / reminders that
-- moved, and rewinds the kept contact's fields. Refuses if the kept contact has since been deleted.
create function public.undo_merge(p_history bigint)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  me     uuid := public.current_manager_id();
  h      public.contact_history;
  item   jsonb;
  mid    uuid;
  before jsonb;
begin
  if me is null then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into h from public.contact_history where id = p_history and kind = 'merged' for update;
  if not found then raise exception 'merge not found'; end if;
  if coalesce((h.data ->> 'undone')::boolean, false) then raise exception 'this merge was already undone'; end if;
  if not exists (select 1 from public.contacts where id = h.contact_id and deleted_at is null) then
    raise exception 'the kept contact has been deleted; restore it first';
  end if;
  before := h.data -> 'before';

  for item in select * from jsonb_array_elements(h.data -> 'merged') loop
    mid := (item -> 'contact' ->> 'id')::uuid;
    update public.contacts set deleted_at = null, deleted_by = null, merged_into = null
     where id = mid and merged_into = h.contact_id;
    if found then
      update public.inquiries     set contact_id = mid
       where contact_id = h.contact_id and id in (select (jsonb_array_elements_text(item -> 'inquiries'))::uuid);
      update public.contact_notes set contact_id = mid
       where contact_id = h.contact_id and id in (select (jsonb_array_elements_text(item -> 'notes'))::uuid);
      update public.reminders     set contact_id = mid
       where contact_id = h.contact_id and id in (select (jsonb_array_elements_text(item -> 'reminders'))::uuid);
    end if;
  end loop;

  update public.contacts set
    name         = before ->> 'name',
    types        = array(select jsonb_array_elements_text(before -> 'types')),
    phones       = array(select jsonb_array_elements_text(before -> 'phones')),
    emails       = array(select jsonb_array_elements_text(before -> 'emails')),
    whatsapp     = before ->> 'whatsapp',
    organisation = before ->> 'organisation',
    city         = before ->> 'city',
    instagram    = before ->> 'instagram',
    language     = before ->> 'language',
    owner_id     = (before ->> 'owner_id')::uuid,
    notes        = before ->> 'notes'
  where id = h.contact_id;

  update public.contact_history set data = data || '{"undone": true}' where id = h.id;
  insert into public.contact_history (contact_id, actor_id, kind, data)
    values (h.contact_id, me, 'merge_undone', jsonb_build_object('history_id', h.id));
end $$;

-- Website enquiries: find the contact with the same phone (last 9 digits, so 0771234567 = +94 77 123 4567) or email, or make a
-- new one from the enquiry, and link it. Called by the intake Pages Function with the service key, after the lineup is saved so
-- the owner is already set. Never raises on missing data: the enquiry itself is already stored.
create function public.link_intake_contact(p_inquiry uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  i      public.inquiries;
  cid    uuid;
  digits text;
begin
  select * into i from public.inquiries where id = p_inquiry;
  if not found then return null; end if;
  if i.contact_id is not null then return i.contact_id; end if;
  digits := regexp_replace(coalesce(i.organizer_phone, ''), '\D', '', 'g');
  select c.id into cid from public.contacts c
   where c.deleted_at is null and (
     (coalesce(i.organizer_email, '') <> '' and exists (select 1 from unnest(c.emails) e where lower(e) = lower(i.organizer_email)))
     or (length(digits) >= 7 and exists (
           select 1 from unnest(c.phones || array[coalesce(c.whatsapp, '')]) ph
            where length(regexp_replace(ph, '\D', '', 'g')) >= 7
              and right(regexp_replace(ph, '\D', '', 'g'), 9) = right(digits, 9)))
   )
   order by c.created_at limit 1;
  if cid is null and nullif(btrim(coalesce(i.organizer_name, '')), '') is not null then
    insert into public.contacts (name, types, phones, emails, city, owner_id)
    values (left(btrim(i.organizer_name), 200), '{client}',
            case when length(digits) >= 7 then array[left(i.organizer_phone, 40)] else '{}' end,
            case when coalesce(i.organizer_email, '') <> '' then array[lower(left(i.organizer_email, 254))] else '{}' end,
            left(i.city, 100), i.owner_id)
    returning id into cid;
  end if;
  if cid is not null then update public.inquiries set contact_id = cid where id = p_inquiry; end if;
  return cid;
end $$;
revoke execute on function public.link_intake_contact(uuid) from public, anon, authenticated;
grant execute on function public.link_intake_contact(uuid) to service_role;

-- Hard-delete contacts that have sat in Trash for 30 days. Not scheduled: run it by hand from the SQL editor when wanted.
create function public.purge_old_contacts() returns integer
language sql security definer set search_path = ''
as $$ with gone as (delete from public.contacts where deleted_at < now() - interval '30 days' returning 1) select count(*)::int from gone $$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.contact_stats(date), public.set_inquiry_contact(uuid, uuid),
  public.set_inquiry_publish_hold(uuid, boolean), public.merge_contacts(uuid, uuid[], jsonb), public.undo_merge(bigint)
  to authenticated;
grant execute on function public.purge_old_contacts() to service_role;
grant execute on all functions in schema public to service_role;

-- ---------- starter WhatsApp templates (the team edits or replaces these in the app) ----------
insert into public.message_templates (title, language, body) values
  ('Say hello', 'English', 'Hi {name}, this is {me} from FLOST8. Thanks for reaching out. Could you tell me the date, venue and the kind of night you have in mind?'),
  ('Follow up on quote', 'English', 'Hi {name}, just checking in on the quote we sent for {event} on {date}. Happy to adjust anything. Shall we lock the date in?'),
  ('Confirm the date', 'English', 'Hi {name}, confirming {event} at {venue} on {date}. Please reply to confirm and we will send over the details.'),
  ('Deposit reminder', 'English', 'Hi {name}, a quick reminder about the deposit for {event} on {date}. Once it is in, the date is locked for you.'),
  ('Thank you', 'English', 'Hi {name}, thank you for having us at {event}. It was a great night. Let us know when you are planning the next one.');

commit;
