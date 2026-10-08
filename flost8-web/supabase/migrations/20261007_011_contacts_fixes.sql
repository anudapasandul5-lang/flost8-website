-- FLOST8 /manage: contacts fixes found by the code review of migration 010. NOT APPLIED. Needs Anuda's explicit OK.
-- Replaces three functions in place (same signatures, so existing grants stay). No table or column changes.
--
--   * undo_merge no longer discards edits made after the merge. merge_contacts now also stores the merged result
--     ('after'); undo rewinds a field to its pre-merge value only if nobody has changed it since the merge.
--     Merges recorded by 010 have no 'after' and are refused with a plain message (none exist when this was written).
--   * undo_merge refuses up front if a merged contact is no longer there, instead of half-restoring.
--   * purge_old_contacts leaves merged-away contacts alone, because their merge can still be undone.

begin;

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

  select to_jsonb(c) into after from public.contacts c where c.id = p_keep;
  insert into public.contact_history (contact_id, actor_id, kind, data)
    values (p_keep, me, 'merged', jsonb_build_object('before', before, 'after', after, 'merged', snap));
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

  -- all or nothing: every merged contact must still be there and still point at the keeper
  for item in select * from jsonb_array_elements(h.data -> 'merged') loop
    mid := (item -> 'contact' ->> 'id')::uuid;
    if not exists (select 1 from public.contacts where id = mid and merged_into = h.contact_id) then
      raise exception 'a merged contact is no longer available, so this merge cannot be undone';
    end if;
  end loop;

  for item in select * from jsonb_array_elements(h.data -> 'merged') loop
    mid := (item -> 'contact' ->> 'id')::uuid;
    update public.contacts set deleted_at = null, deleted_by = null, merged_into = null where id = mid;
    update public.inquiries     set contact_id = mid
     where contact_id = h.contact_id and id in (select (jsonb_array_elements_text(item -> 'inquiries'))::uuid);
    update public.contact_notes set contact_id = mid
     where contact_id = h.contact_id and id in (select (jsonb_array_elements_text(item -> 'notes'))::uuid);
    update public.reminders     set contact_id = mid
     where contact_id = h.contact_id and id in (select (jsonb_array_elements_text(item -> 'reminders'))::uuid);
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

-- Merged-away contacts are not purged: their merge can still be undone while they exist.
create or replace function public.purge_old_contacts() returns integer
language sql security definer set search_path = ''
as $$ with gone as (delete from public.contacts where deleted_at < now() - interval '30 days' and merged_into is null returning 1) select count(*)::int from gone $$;

commit;
