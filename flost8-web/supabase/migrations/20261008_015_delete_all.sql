-- Delete + edit rights (2026-10-08, owner's request): every inquiry can be deleted, a trashed contact can be erased for good,
-- and an imported sheet event can be taken over, one at a time, so it can be edited in the app.
--   1. A manager may delete any inquiry that is theirs (before: only ones added in the app). The owner could already delete any.
--      Deleting cascades to lineup, money, activity, comments and reminders (all ON DELETE CASCADE, which RLS does not filter).
--   2. A deleted sheet-imported inquiry leaves its sheet_key in deleted_sheet_keys, and the importer (import.gs) skips those keys.
--      Without that the 15-minute importer would put the row straight back.
--      To let a sheet row come back on purpose: delete its row from deleted_sheet_keys (service role / SQL editor).
--   3. take_over_sheet_inquiry(id): the owner, or the manager an imported event belongs to, turns that one event into a normal app
--      event ('manual', held back from the public Shows list so it cannot duplicate the sync.gs row) and its sheet_key joins
--      deleted_sheet_keys (reason 'taken_over') so the importer stops overwriting it. Other sheet events keep syncing.
--      There is no way back to the sheet.
--   4. The owner can permanently delete a contact that is already in Trash, unless merged-away contacts still point at it. Contact notes, history and reminders go with it;
--      inquiries that pointed at it are kept and just lose the link (inquiries.contact_id is ON DELETE SET NULL).

begin;

-- ---------- 1. managers delete their own inquiries, whatever the source ----------
drop policy if exists inquiries_delete_own_app on public.inquiries;
create policy inquiries_delete_own on public.inquiries for delete to authenticated
  using (owner_id = public.current_manager_id());

-- ---------- 2. a deleted sheet row must stay deleted ----------
create table if not exists public.deleted_sheet_keys (
  sheet_key  text primary key,
  deleted_at timestamptz not null default now(),
  deleted_by uuid references public.managers (id) on delete set null,
  reason     text not null default 'deleted' check (reason in ('deleted', 'taken_over'))
);
alter table public.deleted_sheet_keys enable row level security;   -- no policy, no grant: only the importer (service role) reads it
revoke all on public.deleted_sheet_keys from public, anon, authenticated;
grant  all on public.deleted_sheet_keys to service_role;

create or replace function public.remember_deleted_sheet_key() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  -- only a signed-in manager's delete is remembered; a clean-up run from SQL or a script must not block rows
  if old.sheet_key is not null and public.current_manager_id() is not null then
    insert into public.deleted_sheet_keys (sheet_key, deleted_by)
      values (old.sheet_key, public.current_manager_id())
      on conflict (sheet_key) do nothing;
  end if;
  return old;
end $$;
revoke execute on function public.remember_deleted_sheet_key() from public, anon, authenticated;

drop trigger if exists inquiries_remember_sheet_key on public.inquiries;
create trigger inquiries_remember_sheet_key before delete on public.inquiries
  for each row execute function public.remember_deleted_sheet_key();

-- ---------- 3. take over one imported event so it can be edited in the app ----------
-- Same rule as migration 012 plus one in-transaction switch that only take_over_sheet_inquiry() sets.
create or replace function public.protect_sheet_rows() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    if auth.uid() is not null then
      if old.source = 'sheet_import'
         and coalesce(current_setting('flost8.takeover', true), '') <> 'on'
         and (to_jsonb(new) - array['contact_id', 'snoozed_until']) is distinct from (to_jsonb(old) - array['contact_id', 'snoozed_until']) then
        raise exception 'imported rows are read-only until the cutover' using errcode = '42501';
      end if;
      if new.owner_id is distinct from old.owner_id and old.owner_id is not null and not public.is_owner() then
        raise exception 'only the owner role can reassign an inquiry' using errcode = '42501';
      end if;
    end if;
    return new;
  end $$;

-- Migration 002's identity guard also stops 'source' changing, so it honours the same switch (and nothing else about it changes).
create or replace function public.protect_inquiry_columns() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    if auth.uid() is not null and coalesce(current_setting('flost8.takeover', true), '') <> 'on' and
       (new.id, new.created_at, new.source, new.sheet_key, new.submission_id, new.sheet_updated_at)
       is distinct from
       (old.id, old.created_at, old.source, old.sheet_key, old.submission_id, old.sheet_updated_at) then
      raise exception 'inquiry identity columns are read-only' using errcode = '42501';
    end if;
    return new;
  end $$;

create or replace function public.take_over_sheet_inquiry(p_inquiry uuid) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare q record;
  begin
    select id, source, owner_id, sheet_key into q from public.inquiries where id = p_inquiry for update;
    -- one message for "missing" and "not yours", so this cannot be used to probe for ids
    if not found or not (public.is_owner() or (q.owner_id is not null and q.owner_id = public.current_manager_id())) then
      raise exception 'not allowed' using errcode = '42501';
    end if;
    if q.source <> 'sheet_import' then
      raise exception 'only an imported event can be taken over' using errcode = '22023';
    end if;
    if q.sheet_key is not null then
      insert into public.deleted_sheet_keys (sheet_key, deleted_by, reason)
        values (q.sheet_key, public.current_manager_id(), 'taken_over')
        on conflict (sheet_key) do nothing;
    end if;
    perform set_config('flost8.takeover', 'on', true);
    update public.inquiries set source = 'manual', no_auto_publish = true where id = p_inquiry;
    perform set_config('flost8.takeover', 'off', true);
  end $$;
revoke execute on function public.take_over_sheet_inquiry(uuid) from public, anon;
grant  execute on function public.take_over_sheet_inquiry(uuid) to authenticated, service_role;

-- ---------- 4. the owner erases a trashed contact for good ----------
grant delete on public.contacts to authenticated;
drop policy if exists contacts_delete on public.contacts;
create policy contacts_delete on public.contacts for delete to authenticated
  using (public.is_owner() and deleted_at is not null
         and not exists (select 1 from public.contacts m where m.merged_into = contacts.id));   -- keep the target of a merge, its merged-away rows still point at it

commit;
