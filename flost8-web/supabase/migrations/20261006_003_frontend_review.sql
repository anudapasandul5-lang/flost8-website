-- FLOST8 booking manager, frontend security review (2026-10-06). Idempotent: safe to re-run.
-- Found by calling the REST API with a real manager-role token (not by reading the UI):
--   * contract_url accepted `javascript:alert(1)`; the dashboard renders it as a link another manager clicks
--   * a manager could edit status/notes/money/lineup of a sheet_import row they own (the UI hides the buttons, the DB did not stop it)
--   * a manager could hand any inquiry they edit to another manager (owner_id)
--   * notes / comments had no size limit
-- Does NOT touch the importer or the money-activity logic. Sheet rows stay writable by the service role (importer) and the SQL editor.
-- When the sheets are retired (cutover), drop trigger inquiries_protect_sheet and the three `*_no_sheet_*` policy pairs.

-- ---------- 1. contract_url must be an http(s) link; text fields get a size cap ----------
alter table public.inquiries drop constraint if exists inquiries_contract_url_http;
alter table public.inquiries add constraint inquiries_contract_url_http
  check (contract_url is null or (contract_url ~* '^https?://[^[:space:]]+$' and length(contract_url) <= 2000));

alter table public.inquiries drop constraint if exists inquiries_text_len;
alter table public.inquiries add constraint inquiries_text_len
  check (coalesce(length(notes), 0) <= 10000 and coalesce(length(travel_notes), 0) <= 5000);

alter table public.activity drop constraint if exists activity_comment_len;
alter table public.activity add constraint activity_comment_len
  check (kind <> 'comment' or length(coalesce(data ->> 'text', '')) between 1 and 5000);

-- ---------- 2. imported sheet rows are read-only for signed-in users; only the owner role may reassign ----------
create or replace function public.protect_sheet_rows() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    if auth.uid() is not null then
      if old.source = 'sheet_import' then
        raise exception 'imported rows are read-only until the cutover' using errcode = '42501';
      end if;
      if new.owner_id is distinct from old.owner_id and old.owner_id is not null and not public.is_owner() then
        raise exception 'only the owner role can reassign an inquiry' using errcode = '42501';
      end if;
    end if;
    return new;
  end $$;

drop trigger if exists inquiries_protect_sheet on public.inquiries;
create trigger inquiries_protect_sheet before update on public.inquiries
  for each row execute function public.protect_sheet_rows();

-- Restrictive policies are ANDed with the existing ones. One per command: a FOR ALL restrictive policy would also hide
-- SELECT, and managers must still read the money of imported rows of their own artists.
do $$
declare t text; c text;
begin
  foreach t in array array['inquiry_money', 'inquiry_artists'] loop
    foreach c in array array['insert', 'update', 'delete'] loop
      execute format('drop policy if exists %I on public.%I', t || '_no_sheet_' || c, t);
    end loop;
    execute format($f$create policy %I on public.%I as restrictive for insert to authenticated
      with check (not exists (select 1 from public.inquiries q where q.id = inquiry_id and q.source = 'sheet_import'))$f$,
      t || '_no_sheet_insert', t);
    execute format($f$create policy %I on public.%I as restrictive for update to authenticated
      using (not exists (select 1 from public.inquiries q where q.id = inquiry_id and q.source = 'sheet_import'))
      with check (not exists (select 1 from public.inquiries q where q.id = inquiry_id and q.source = 'sheet_import'))$f$,
      t || '_no_sheet_update', t);
    execute format($f$create policy %I on public.%I as restrictive for delete to authenticated
      using (not exists (select 1 from public.inquiries q where q.id = inquiry_id and q.source = 'sheet_import'))$f$,
      t || '_no_sheet_delete', t);
  end loop;
end $$;
