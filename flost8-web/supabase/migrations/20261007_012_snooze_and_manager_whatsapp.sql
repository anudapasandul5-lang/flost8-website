-- Migration 012: snooze + manager WhatsApp numbers.
--
-- (1) inquiries.snoozed_until: a salesperson hides a row from "Needs you" until that date. It is not a touch (does not
--     bump updated_at) and it is the one thing besides contact_id a signed-in user may change on a sheet-imported row.
--     The importer never sends this column, so its upsert leaves it alone.
-- (2) managers.whatsapp: the owner's Nudge button. Readable and writable ONLY through two owner-only security-definer
--     functions; the column is kept out of every other role's table privileges.
-- Existing inquiries RLS (inquiries_update) already covers the new column like every other inquiry column.

-- ---------- (1) snooze ----------
alter table public.inquiries add column snoozed_until date;

create or replace function public.touch_updated_at() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    if (to_jsonb(new) - array['updated_at', 'contact_id', 'snoozed_until']) = (to_jsonb(old) - array['updated_at', 'contact_id', 'snoozed_until']) then
      return new;
    end if;
    new.updated_at = now();
    return new;
  end $$;

-- Same as migration 010, plus: snoozed_until may change on an imported row (and nothing else but contact_id).
create or replace function public.protect_sheet_rows() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    if auth.uid() is not null then
      if old.source = 'sheet_import'
         and (to_jsonb(new) - array['contact_id', 'snoozed_until']) is distinct from (to_jsonb(old) - array['contact_id', 'snoozed_until']) then
        raise exception 'imported rows are read-only until the cutover' using errcode = '42501';
      end if;
      if new.owner_id is distinct from old.owner_id and old.owner_id is not null and not public.is_owner() then
        raise exception 'only the owner role can reassign an inquiry' using errcode = '42501';
      end if;
    end if;
    return new;
  end $$;

-- ---------- (2) manager whatsapp ----------
alter table public.managers add column whatsapp text;
alter table public.managers add constraint managers_whatsapp_format check (whatsapp is null or whatsapp ~ '^\+?[0-9]{7,15}$');

-- Table-level SELECT is replaced by a column list that leaves whatsapp out, for every client role.
-- (The owner reads numbers through manager_whatsapps() only.)
revoke select on public.managers from anon, authenticated;
grant  select (id, email, name, role, user_id, created_at) on public.managers to authenticated;

create or replace function public.manager_whatsapps() returns table (manager_id uuid, whatsapp text)
  language plpgsql stable security definer set search_path = ''
  as $$
  begin
    if not public.is_owner() then
      raise exception 'owner only' using errcode = '42501';
    end if;
    return query select m.id, m.whatsapp from public.managers m where m.whatsapp is not null;
  end $$;

create or replace function public.set_manager_whatsapp(p_manager uuid, p_whatsapp text) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare v text := nullif(btrim(p_whatsapp), '');
  begin
    if not public.is_owner() then
      raise exception 'owner only' using errcode = '42501';
    end if;
    if v is not null and v !~ '^\+?[0-9]{7,15}$' then
      raise exception 'WhatsApp number must be digits with an optional leading +, 7 to 15 digits' using errcode = '22023';
    end if;
    update public.managers set whatsapp = v where id = p_manager;
    if not found then
      raise exception 'no such manager' using errcode = 'P0002';
    end if;
  end $$;

revoke execute on function public.manager_whatsapps(), public.set_manager_whatsapp(uuid, text) from public, anon;
grant  execute on function public.manager_whatsapps(), public.set_manager_whatsapp(uuid, text) to authenticated, service_role;
