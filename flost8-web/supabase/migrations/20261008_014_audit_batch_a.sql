-- FLOST8 /manage: fixes for the 2026-10-08 security audit leads (Batch A). APPLIED to the live DB 2026-10-08 (Anuda said "apply").
-- Proofs: supabase/proofs/audit_batch_a.proof.mjs (fails on 001-013, passes with this file).
--
--   1. Unowned inquiries. can_edit let ANY caller through when an inquiry had no owner (even a manager whose link was removed),
--      and the permissive FOR ALL policies on inquiry_artists / inquiry_money also granted SELECT, so lineup and money of an
--      inquiry the parent table hides were readable. Now: an ownerless inquiry is editable only by someone who can view it,
--      money follows can_view, and the child write policies are split per command so they no longer grant SELECT.
--   2. A signed-in user could INSERT an inquiry with a chosen sheet_key / source / submission_id / sheet_updated_at (the identity
--      freeze only fired on UPDATE). A later privileged sheet import then merged into that row and kept the planted owner.
--      Now INSERT by a signed-in user must be a plain manual row with those columns empty. The service role is unaffected.
--   3. merge_contacts stored every linked inquiry id and reminder id (including other managers' hidden ones) in contact_history,
--      which every manager can read. Those id lists now live in a table no signed-in user can read; undo_merge reads it as
--      definer. Existing merge rows are moved over and stripped.

begin;

-- ---------- 1. unowned inquiries ----------
create or replace function public.can_edit(i uuid) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select public.is_owner() or exists (
      select 1 from public.inquiries q
      where q.id = i
        and (q.owner_id = public.current_manager_id()
             or (q.owner_id is null and public.can_view(i)))
    )
  $$;

-- money is visible to whoever can view the inquiry (owner role, its owner, a manager with an artist on the lineup)
create or replace function public.can_see_money(i uuid) returns boolean
  language sql stable security definer set search_path = ''
  as $$ select public.can_view(i) $$;

drop policy ia_write on public.inquiry_artists;
create policy ia_insert on public.inquiry_artists for insert to authenticated with check (public.can_edit(inquiry_id));
create policy ia_update on public.inquiry_artists for update to authenticated
  using (public.can_edit(inquiry_id)) with check (public.can_edit(inquiry_id));
create policy ia_delete on public.inquiry_artists for delete to authenticated using (public.can_edit(inquiry_id));

drop policy money_write on public.inquiry_money;
create policy money_insert on public.inquiry_money for insert to authenticated with check (public.can_edit(inquiry_id));
create policy money_update on public.inquiry_money for update to authenticated
  using (public.can_edit(inquiry_id)) with check (public.can_edit(inquiry_id));
create policy money_delete on public.inquiry_money for delete to authenticated using (public.can_edit(inquiry_id));

-- the parent table's update rule had the same ownerless hole written a second way; point it at can_edit so the two cannot disagree
drop policy inquiries_update on public.inquiries;
create policy inquiries_update on public.inquiries for update to authenticated
  using (public.can_edit(id)) with check (public.is_manager());

-- ---------- 2. import identity cannot be planted on INSERT ----------
create or replace function public.protect_inquiry_insert() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    if auth.uid() is not null and
       (new.source is distinct from 'manual' or new.sheet_key is not null or new.submission_id is not null or new.sheet_updated_at is not null) then
      raise exception 'inquiry identity columns are read-only' using errcode = '42501';
    end if;
    return new;
  end $$;

drop trigger if exists inquiries_protect_insert on public.inquiries;
create trigger inquiries_protect_insert before insert on public.inquiries
  for each row execute function public.protect_inquiry_insert();

-- ---------- 3. merge history keeps no hidden ids ----------
create table public.contact_merge_links (
  history_id bigint primary key references public.contact_history (id) on delete cascade,
  links      jsonb not null default '[]'      -- [{ "id": <merged contact id>, "inquiries": [uuid], "reminders": [uuid] }]
);
alter table public.contact_merge_links enable row level security;   -- no policy, no grant: signed-in users cannot read or write
revoke all on public.contact_merge_links from public, anon, authenticated;
grant  all on public.contact_merge_links to service_role;

-- move the ids out of the readable history rows that already exist
insert into public.contact_merge_links (history_id, links)
  select h.id,
         (select coalesce(jsonb_agg(jsonb_build_object('id', item -> 'contact' ->> 'id',
                                                       'inquiries', coalesce(item -> 'inquiries', '[]'),
                                                       'reminders', coalesce(item -> 'reminders', '[]'))), '[]')
            from jsonb_array_elements(h.data -> 'merged') item)
    from public.contact_history h
   where h.kind = 'merged' and jsonb_typeof(h.data -> 'merged') = 'array';

update public.contact_history h
   set data = jsonb_set(h.data, '{merged}',
         (select coalesce(jsonb_agg(item - 'inquiries' - 'reminders'), '[]') from jsonb_array_elements(h.data -> 'merged') item))
 where h.kind = 'merged' and jsonb_typeof(h.data -> 'merged') = 'array';

create or replace function public.merge_contacts(p_keep uuid, p_merge uuid[], p_fields jsonb default '{}')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  me       uuid := public.current_manager_id();
  k        public.contacts;
  m        public.contacts;
  before   jsonb;
  after    jsonb;
  snap     jsonb := '[]';
  links    jsonb := '[]';
  hid      bigint;
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
    -- the history row (readable by every manager) gets the contact and its shared notes only; inquiry and reminder ids go to the private table
    snap  := snap  || jsonb_build_array(jsonb_build_object('contact', to_jsonb(m), 'notes', to_jsonb(nts)));
    links := links || jsonb_build_array(jsonb_build_object('id', m.id, 'inquiries', to_jsonb(inq), 'reminders', to_jsonb(rem)));
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

  select to_jsonb(c) into after from public.contacts c where c.id = p_keep;
  insert into public.contact_history (contact_id, actor_id, kind, data)
    values (p_keep, me, 'merged', jsonb_build_object('before', before, 'after', after, 'merged', snap))
    returning id into hid;
  insert into public.contact_merge_links (history_id, links) values (hid, links);
  return p_keep;
end $$;

create or replace function public.undo_merge(p_history bigint)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  me     uuid := public.current_manager_id();
  h      public.contact_history;
  cur    public.contacts;
  item   jsonb;
  lk     jsonb;
  mid    uuid;
  b      jsonb;
  a      jsonb;
  c      jsonb;
begin
  if me is null then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into h from public.contact_history where id = p_history and kind = 'merged' for update;
  if not found then raise exception 'merge not found'; end if;
  if coalesce((h.data ->> 'undone')::boolean, false) then raise exception 'this merge was already undone'; end if;
  select * into cur from public.contacts where id = h.contact_id and deleted_at is null for update;
  if not found then raise exception 'the kept contact has been deleted; restore it first'; end if;
  b := h.data -> 'before';
  a := h.data -> 'after';
  if a is null then raise exception 'this merge was recorded before safe undo existed and cannot be undone'; end if;
  select links into lk from public.contact_merge_links where history_id = h.id;
  if lk is null then raise exception 'this merge has no saved links and cannot be undone'; end if;

  -- all or nothing: every merged contact must still be there and still point at the keeper
  for item in select * from jsonb_array_elements(h.data -> 'merged') loop
    mid := (item -> 'contact' ->> 'id')::uuid;
    if not exists (select 1 from public.contacts where id = mid and merged_into = h.contact_id) then
      raise exception 'a merged contact is no longer available, so this merge cannot be undone';
    end if;
    if not exists (select 1 from jsonb_array_elements(lk) l where l ->> 'id' = mid::text) then
      raise exception 'this merge has incomplete saved links and cannot be undone';
    end if;
  end loop;

  for item in select * from jsonb_array_elements(h.data -> 'merged') loop
    mid := (item -> 'contact' ->> 'id')::uuid;
    update public.contacts set deleted_at = null, deleted_by = null, merged_into = null where id = mid;
    update public.inquiries     set contact_id = mid
     where contact_id = h.contact_id and id in (
       select (jsonb_array_elements_text(l -> 'inquiries'))::uuid from jsonb_array_elements(lk) l where l ->> 'id' = mid::text);
    update public.contact_notes set contact_id = mid
     where contact_id = h.contact_id and id in (select (jsonb_array_elements_text(item -> 'notes'))::uuid);
    update public.reminders     set contact_id = mid
     where contact_id = h.contact_id and id in (
       select (jsonb_array_elements_text(l -> 'reminders'))::uuid from jsonb_array_elements(lk) l where l ->> 'id' = mid::text);
  end loop;

  -- rewind a field only if nobody has changed it since the merge; otherwise keep the newer edit
  c := to_jsonb(cur);
  update public.contacts set
    name         = case when c -> 'name'         is not distinct from a -> 'name'         then b ->> 'name'         else cur.name end,
    types        = case when c -> 'types'        is not distinct from a -> 'types'        then array(select jsonb_array_elements_text(b -> 'types'))  else cur.types end,
    phones       = case when c -> 'phones'       is not distinct from a -> 'phones'       then array(select jsonb_array_elements_text(b -> 'phones')) else cur.phones end,
    emails       = case when c -> 'emails'       is not distinct from a -> 'emails'       then array(select jsonb_array_elements_text(b -> 'emails')) else cur.emails end,
    whatsapp     = case when c -> 'whatsapp'     is not distinct from a -> 'whatsapp'     then b ->> 'whatsapp'     else cur.whatsapp end,
    organisation = case when c -> 'organisation' is not distinct from a -> 'organisation' then b ->> 'organisation' else cur.organisation end,
    city         = case when c -> 'city'         is not distinct from a -> 'city'         then b ->> 'city'         else cur.city end,
    instagram    = case when c -> 'instagram'    is not distinct from a -> 'instagram'    then b ->> 'instagram'    else cur.instagram end,
    language     = case when c -> 'language'     is not distinct from a -> 'language'     then b ->> 'language'     else cur.language end,
    owner_id     = case when c -> 'owner_id'     is not distinct from a -> 'owner_id'     then (b ->> 'owner_id')::uuid else cur.owner_id end,
    notes        = case when c -> 'notes'        is not distinct from a -> 'notes'        then b ->> 'notes'        else cur.notes end
  where id = h.contact_id;

  update public.contact_history set data = data || '{"undone": true}' where id = h.id;
  insert into public.contact_history (contact_id, actor_id, kind, data)
    values (h.contact_id, me, 'merge_undone', jsonb_build_object('history_id', h.id));
end $$;

commit;
