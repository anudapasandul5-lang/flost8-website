-- FLOST8 booking manager, T0. Project: "Bookings Backend" (ybeenrpelytyohpyurzn).
-- Columns follow the managers' real sheets (FLOST8 - Kasuni / FLOST8 - Nirbheeth). Sheets stay master and are
-- imported one-way until a cutover day; the app must treat sheet_import rows as read-only until then.
-- Rules (from the 2026-10-06 grilling):
--   * Only people listed in `managers` can sign in (allow-list, checked on auth.users insert).
--   * Every manager reads every inquiry. Edit rights = inquiry owner (manager of the first artist) or the owner role.
--   * Money lives in its own table; a manager sees it only on inquiries involving one of their artists.
--   * Nobody but the owner role can delete. Spam = status 'spam' (archived).
--   * Activity rows are written by triggers; money changes are logged WITHOUT amounts (activity is readable by all).

-- ---------- tables ----------
create table public.managers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique check (email = lower(email)),
  name       text not null,
  role       text not null default 'manager' check (role in ('owner', 'manager')),
  user_id    uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.artists (
  slug       text primary key,
  name       text not null,
  manager_id uuid references public.managers (id)
);

create table public.inquiries (
  id              uuid primary key default gen_random_uuid(),
  submission_id   text unique,                       -- idempotency key for website intake / sheet import
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- the managers' own words are reached_out + booking_confirmed; the rest were added at Anuda's request
  status          text not null default 'new'
                  check (status in ('new','reached_out','quoted','deposit_paid','booking_confirmed','lost','spam')),
  source          text not null default 'website',   -- website | manual | sheet_import
  owner_id        uuid references public.managers (id),
  -- one-way sheet import key: same sheet + tab + Row ID is updated, never duplicated
  sheet_key       text unique,
  sheet_updated_at timestamptz,
  set_type        text,
  event_name      text,
  event_date      date,
  venue           text,                               -- sheet "Venue / Page Name"
  city            text,
  event_type      text,
  set_duration_h  numeric,
  set_time        text,                               -- sheet "Set Time / Remarks"
  deal_type       text,                               -- sheet "Type"
  lead_source     text,
  platform        text,
  brand           text,
  collab_type     text,
  invoice_no      text,
  organizer_name  text,                               -- sheet "Contact Name"
  organizer_phone text,
  organizer_email text,
  other_artists   text,
  notes           text,
  contract_signed boolean not null default false,
  contract_url    text,
  travel_notes    text,
  lost_reason     text,
  raw             jsonb
);

create table public.inquiry_artists (
  inquiry_id  uuid not null references public.inquiries (id) on delete cascade,
  position    smallint not null,
  artist_slug text not null references public.artists (slug),
  primary key (inquiry_id, position)
);

create table public.inquiry_money (
  inquiry_id      uuid primary key references public.inquiries (id) on delete cascade,
  currency        text not null default 'LKR' check (currency in ('LKR','USD')),
  fee             numeric check (fee >= 0),            -- sheet "Fee (LKR)" = the quote
  advance         numeric check (advance >= 0),        -- sheet "Advance (LKR)" = deposit
  balance         numeric,                             -- sheet "Balance (LKR)"; managers type notes like POSTPONED here, so imports put non-numbers in balance_note
  balance_note    text,
  total           numeric,
  booking_fee     numeric,
  advance_paid_at timestamptz,
  balance_paid_at timestamptz
);

create table public.activity (
  id         bigint generated always as identity primary key,
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  actor_id   uuid references public.managers (id),
  kind       text not null,                          -- comment | status | owner | money | contract | created
  data       jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.reminders (
  id         uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  manager_id uuid not null references public.managers (id),
  due_at     timestamptz not null,
  note       text,
  done       boolean not null default false
);

create index on public.inquiries (status);
create index on public.inquiries (event_date);
create index on public.inquiries (owner_id);
create index on public.inquiry_artists (artist_slug);
create index on public.activity (inquiry_id, created_at);
create index on public.reminders (manager_id, due_at) where not done;

-- ---------- helpers (security definer so RLS does not recurse) ----------
create function public.current_manager_id() returns uuid
  language sql stable security definer set search_path = ''
  as $$ select id from public.managers where user_id = auth.uid() $$;

create function public.is_manager() returns boolean
  language sql stable security definer set search_path = ''
  as $$ select exists (select 1 from public.managers where user_id = auth.uid()) $$;

create function public.is_owner() returns boolean
  language sql stable security definer set search_path = ''
  as $$ select exists (select 1 from public.managers where user_id = auth.uid() and role = 'owner') $$;

-- edit rights: owner role, the inquiry's owner, or anyone if nobody owns it yet
create function public.can_edit(i uuid) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select public.is_owner() or exists (
      select 1 from public.inquiries q
      where q.id = i and (q.owner_id is null or q.owner_id = public.current_manager_id())
    )
  $$;

-- money visibility: can edit, or the inquiry involves one of my artists
create function public.can_see_money(i uuid) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select public.can_edit(i) or exists (
      select 1 from public.inquiry_artists ia
      join public.artists a on a.slug = ia.artist_slug
      where ia.inquiry_id = i and a.manager_id = public.current_manager_id()
    )
  $$;

-- ---------- sign-in allow-list ----------
create function public.guard_new_user() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if not exists (select 1 from public.managers where email = lower(new.email)) then
      raise exception 'This email is not allowed to sign in';
    end if;
    return new;
  end $$;

create function public.link_new_user() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    update public.managers set user_id = new.id where email = lower(new.email) and user_id is null;
    return new;
  end $$;

create trigger guard_new_user before insert on auth.users
  for each row execute function public.guard_new_user();
create trigger link_new_user after insert on auth.users
  for each row execute function public.link_new_user();

-- ---------- triggers ----------
create function public.touch_updated_at() returns trigger
  language plpgsql set search_path = ''
  as $$ begin new.updated_at = now(); return new; end $$;
create trigger inquiries_touch before update on public.inquiries
  for each row execute function public.touch_updated_at();

-- first artist's manager becomes the inquiry owner
create function public.assign_owner() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if new.position = 1 then
      update public.inquiries i
         set owner_id = a.manager_id
        from public.artists a
       where i.id = new.inquiry_id and i.owner_id is null and a.slug = new.artist_slug;
    end if;
    return new;
  end $$;
create trigger assign_owner after insert on public.inquiry_artists
  for each row execute function public.assign_owner();

create function public.log_inquiry_change() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  declare me uuid := public.current_manager_id();
  begin
    if tg_op = 'INSERT' then
      insert into public.activity (inquiry_id, actor_id, kind, data)
        values (new.id, me, 'created', jsonb_build_object('source', new.source));
      return new;
    end if;
    if new.status is distinct from old.status then
      insert into public.activity (inquiry_id, actor_id, kind, data)
        values (new.id, me, 'status', jsonb_build_object('from', old.status, 'to', new.status));
    end if;
    if new.owner_id is distinct from old.owner_id then
      insert into public.activity (inquiry_id, actor_id, kind, data)
        values (new.id, me, 'owner', jsonb_build_object('from', old.owner_id, 'to', new.owner_id));
    end if;
    if new.contract_signed is distinct from old.contract_signed then
      insert into public.activity (inquiry_id, actor_id, kind, data)
        values (new.id, me, 'contract', jsonb_build_object('signed', new.contract_signed));
    end if;
    return new;
  end $$;
create trigger log_inquiry_change after insert or update on public.inquiries
  for each row execute function public.log_inquiry_change();

-- money changes are logged with no amounts on purpose
create function public.log_money_change() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    insert into public.activity (inquiry_id, actor_id, kind)
      values (new.inquiry_id, public.current_manager_id(), 'money');
    return new;
  end $$;
create trigger log_money_change after insert or update on public.inquiry_money
  for each row execute function public.log_money_change();

-- ---------- row level security ----------
alter table public.managers        enable row level security;
alter table public.artists         enable row level security;
alter table public.inquiries       enable row level security;
alter table public.inquiry_artists enable row level security;
alter table public.inquiry_money   enable row level security;
alter table public.activity        enable row level security;
alter table public.reminders       enable row level security;

create policy managers_read   on public.managers for select to authenticated using (public.is_manager());
create policy managers_write  on public.managers for all    to authenticated using (public.is_owner()) with check (public.is_owner());

create policy artists_read    on public.artists  for select to authenticated using (public.is_manager());
create policy artists_write   on public.artists  for all    to authenticated using (public.is_owner()) with check (public.is_owner());

create policy inquiries_read   on public.inquiries for select to authenticated using (public.is_manager());
create policy inquiries_insert on public.inquiries for insert to authenticated
  with check (public.is_manager() and (owner_id is null or owner_id = public.current_manager_id() or public.is_owner()));
create policy inquiries_update on public.inquiries for update to authenticated
  using (public.is_owner() or owner_id is null or owner_id = public.current_manager_id())
  with check (public.is_manager());
create policy inquiries_delete on public.inquiries for delete to authenticated using (public.is_owner());

create policy ia_read   on public.inquiry_artists for select to authenticated using (public.is_manager());
create policy ia_write  on public.inquiry_artists for all    to authenticated
  using (public.can_edit(inquiry_id)) with check (public.can_edit(inquiry_id));

create policy money_read  on public.inquiry_money for select to authenticated using (public.can_see_money(inquiry_id));
create policy money_write on public.inquiry_money for all    to authenticated
  using (public.can_edit(inquiry_id)) with check (public.can_edit(inquiry_id));

create policy activity_read    on public.activity for select to authenticated using (public.is_manager());
create policy activity_comment on public.activity for insert to authenticated
  with check (public.is_manager() and kind = 'comment' and actor_id = public.current_manager_id());

create policy reminders_own on public.reminders for all to authenticated
  using (manager_id = public.current_manager_id() or public.is_owner())
  with check (manager_id = public.current_manager_id() or public.is_owner());

-- anon (the public site key) gets nothing; website intake uses the service role on the server only
revoke all on all tables    in schema public from anon;
revoke all on all functions in schema public from anon;

-- ---------- seed: people and artists (emails are filled in later by the owner) ----------
insert into public.managers (name, role) values ('Kasuni', 'manager'), ('Nirbheeth', 'manager');

insert into public.artists (slug, name, manager_id) values
  ('sonal',        'Sonal',         (select id from public.managers where name = 'Kasuni')),
  ('dr-green',     'Dr. Green',     (select id from public.managers where name = 'Kasuni')),
  ('maalin',       'Maalin',        (select id from public.managers where name = 'Kasuni')),
  ('imthxd',       'IMTHXD',        (select id from public.managers where name = 'Nirbheeth')),
  ('anush',        'Anush',         (select id from public.managers where name = 'Nirbheeth')),
  ('the-professor','The Professor', (select id from public.managers where name = 'Nirbheeth'));
