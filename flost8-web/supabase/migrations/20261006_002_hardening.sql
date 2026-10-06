-- FLOST8 booking manager, hardening pass (2026-10-06 adversarial review). Idempotent: safe to re-run.
-- Findings fixed here:
--   * every public function was executable by anon/PUBLIC (RPC surface) -> only the five RLS helpers go to `authenticated`
--   * `authenticated` held TRUNCATE (bypasses RLS), TRIGGER and REFERENCES on every table -> revoked
--   * default privileges would hand anon/authenticated full rights on any FUTURE table/function -> tightened
--   * link_new_user linked a manager row to ANY auth user whose email matched, even an unconfirmed one -> only confirmed emails link
--   * a manager could rewrite inquiries.source / sheet_key / submission_id / created_at / id on a row they edit -> frozen for end users
--   * foreign keys without an index (activity.actor_id, reminders.inquiry_id, artists.manager_id)

-- ---------- 1. link only CONFIRMED emails (defence in depth; email sign-up is also switched off in Auth settings) ----------
create or replace function public.link_new_user() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if new.email_confirmed_at is not null then
      update public.managers set user_id = new.id where email = lower(new.email) and user_id is null;
    end if;
    return new;
  end $$;

drop trigger if exists link_new_user on auth.users;
create trigger link_new_user after insert or update of email_confirmed_at on auth.users
  for each row execute function public.link_new_user();

-- ---------- 2. identity columns of an inquiry are read-only for signed-in users (service role / SQL editor are unaffected) ----------
create or replace function public.protect_inquiry_columns() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    if auth.uid() is not null and
       (new.id, new.created_at, new.source, new.sheet_key, new.submission_id, new.sheet_updated_at)
       is distinct from
       (old.id, old.created_at, old.source, old.sheet_key, old.submission_id, old.sheet_updated_at) then
      raise exception 'inquiry identity columns are read-only' using errcode = '42501';
    end if;
    return new;
  end $$;

drop trigger if exists inquiries_protect on public.inquiries;
create trigger inquiries_protect before update on public.inquiries
  for each row execute function public.protect_inquiry_columns();

-- ---------- 3. indexes on foreign keys ----------
create index if not exists activity_actor_id_idx    on public.activity (actor_id);
create index if not exists reminders_inquiry_id_idx on public.reminders (inquiry_id);
create index if not exists artists_manager_id_idx   on public.artists (manager_id);

-- ---------- 4. privileges ----------
-- functions: nothing for PUBLIC/anon; signed-in users only get the helpers the RLS policies call
revoke execute on all functions in schema public from public, anon, authenticated;
grant  execute on function public.is_manager(), public.is_owner(), public.current_manager_id(),
                           public.can_edit(uuid), public.can_see_money(uuid) to authenticated;
grant  execute on all functions in schema public to service_role;

-- tables: TRUNCATE ignores RLS, TRIGGER/REFERENCES have no business with end users
revoke truncate, trigger, references on all tables in schema public from public, anon, authenticated;
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

-- future objects created by the migration role: no automatic anon access, no automatic function execute
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public revoke truncate, trigger, references on tables from authenticated;
