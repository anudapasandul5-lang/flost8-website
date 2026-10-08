-- Review follow-up to 015: the tombstone trigger used search_path = public; every other definer function here uses ''.
-- Every name in the body is already schema-qualified, so behaviour is unchanged.
begin;

create or replace function public.remember_deleted_sheet_key() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if old.sheet_key is not null and public.current_manager_id() is not null then
    insert into public.deleted_sheet_keys (sheet_key, deleted_by)
      values (old.sheet_key, public.current_manager_id())
      on conflict (sheet_key) do nothing;
  end if;
  return old;
end $$;
revoke execute on function public.remember_deleted_sheet_key() from public, anon, authenticated;

commit;
