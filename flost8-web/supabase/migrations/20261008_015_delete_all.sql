-- Delete rights (2026-10-08, owner's request): every inquiry can be deleted, and a trashed contact can be erased for good.
--   1. A manager may delete any inquiry that is theirs (before: only ones added in the app). The owner could already delete any.
--      Deleting cascades to lineup, money, activity, comments and reminders (all ON DELETE CASCADE, which RLS does not filter).
--   2. A deleted sheet-imported inquiry leaves its sheet_key in deleted_sheet_keys, and the importer (import.gs) skips those keys.
--      Without that the 15-minute importer would put the row straight back.
--   3. The owner can permanently delete a contact that is already in Trash. Contact notes, history and reminders go with it;
--      inquiries that pointed at it are kept and just lose the link (inquiries.contact_id is ON DELETE SET NULL).

-- ---------- 1. managers delete their own inquiries, whatever the source ----------
drop policy if exists inquiries_delete_own_app on public.inquiries;
create policy inquiries_delete_own on public.inquiries for delete to authenticated
  using (owner_id = public.current_manager_id());

-- ---------- 2. a deleted sheet row must stay deleted ----------
create table public.deleted_sheet_keys (
  sheet_key  text primary key,
  deleted_at timestamptz not null default now(),
  deleted_by uuid references public.managers (id) on delete set null
);
alter table public.deleted_sheet_keys enable row level security;   -- no policy, no grant: only the importer (service role) reads it
revoke all on public.deleted_sheet_keys from public, anon, authenticated;
grant  all on public.deleted_sheet_keys to service_role;

create or replace function public.remember_deleted_sheet_key() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if old.sheet_key is not null then
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

-- ---------- 3. the owner erases a trashed contact for good ----------
grant delete on public.contacts to authenticated;
create policy contacts_delete on public.contacts for delete to authenticated
  using (public.is_owner() and deleted_at is not null);
