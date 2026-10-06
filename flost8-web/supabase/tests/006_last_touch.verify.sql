-- Verifies migration 006 (inquiry_last_touch view + activity_comment can_view check).
-- Run AFTER applying 006, as one script (Supabase SQL editor or Composio). It rolls back at the end,
-- so it leaves no users, comments or email changes behind.
-- A failed check raises 'FAIL: ...' and aborts. Success ends with NOTICE 'ALL CHECKS PASSED'.
-- Run BEFORE 006 and it must fail (no view; the stranger comment is not blocked) - failing test first.

begin;

-- Stand-in users. Nirbheeth has no email yet, so give him a throwaway one inside this transaction.
update public.managers set email = 'verify-nirbheeth@test.invalid' where name = 'Nirbheeth';
insert into auth.users (id, email, email_confirmed_at, aud, role)
  values ('00000000-0000-0000-0000-0000000000b1', 'verify-nirbheeth@test.invalid', now(), 'authenticated', 'authenticated');
insert into auth.users (id, email, email_confirmed_at, aud, role)
  select '00000000-0000-0000-0000-0000000000b2', email, now(), 'authenticated', 'authenticated'
    from public.managers where role = 'owner';

-- Ground truth, computed as the table owner before any role switch.
create temp table facts as
select
  (select count(*) from public.inquiries) as total,
  (select count(distinct i.id) from public.inquiries i
     left join public.inquiry_artists ia on ia.inquiry_id = i.id
     left join public.artists a on a.slug = ia.artist_slug
    where i.owner_id = (select id from public.managers where name = 'Nirbheeth')
       or a.manager_id = (select id from public.managers where name = 'Nirbheeth')) as nirb_visible,
  (select i.id from public.inquiries i
    where i.owner_id is distinct from (select id from public.managers where name = 'Nirbheeth')
      and not exists (select 1 from public.inquiry_artists ia join public.artists a on a.slug = ia.artist_slug
                       where ia.inquiry_id = i.id
                         and a.manager_id = (select id from public.managers where name = 'Nirbheeth'))
    limit 1) as hidden_id,
  (select i.id from public.inquiries i
    where i.owner_id = (select id from public.managers where name = 'Nirbheeth') limit 1) as visible_id;
grant select on facts to authenticated, anon;

-- 1. Owner sees a last_touch row for every inquiry.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.inquiry_last_touch) <> (select total from facts) then
    raise exception 'FAIL: owner should see % last_touch rows, saw %', (select total from facts), (select count(*) from public.inquiry_last_touch);
  end if;
end $$;

-- 2. Nirbheeth sees only his own inquiries (plan says 6), never one he cannot see.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.inquiry_last_touch) <> (select nirb_visible from facts) then
    raise exception 'FAIL: Nirbheeth should see % rows, saw %', (select nirb_visible from facts), (select count(*) from public.inquiry_last_touch);
  end if;
  if exists (select 1 from public.inquiry_last_touch where inquiry_id = (select hidden_id from facts)) then
    raise exception 'FAIL: Nirbheeth can see a last_touch row for an inquiry he cannot view';
  end if;
end $$;

-- 3. Stranger comment: commenting on an inquiry he cannot see must be rejected by RLS.
do $$ begin
  begin
    insert into public.activity (inquiry_id, actor_id, kind, data)
      values ((select hidden_id from facts), public.current_manager_id(), 'comment', '{"text":"verify"}');
    raise exception 'FAIL: Nirbheeth commented on an inquiry he cannot see';
  exception when insufficient_privilege then
    raise notice 'PASS: stranger comment blocked';
  end;
end $$;

-- 4. Own-inquiry comment is allowed and moves last_touch forward.
do $$ declare before_ts timestamptz; after_ts timestamptz; begin
  select last_touch into before_ts from public.inquiry_last_touch where inquiry_id = (select visible_id from facts);
  insert into public.activity (inquiry_id, actor_id, kind, data)
    values ((select visible_id from facts), public.current_manager_id(), 'comment', '{"text":"verify"}');
  select last_touch into after_ts from public.inquiry_last_touch where inquiry_id = (select visible_id from facts);
  if after_ts is null or after_ts <= before_ts then
    raise exception 'FAIL: own comment did not advance last_touch (% -> %)', before_ts, after_ts;
  end if;
end $$;

-- 5. Anonymous (public key) gets nothing.
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.inquiry_last_touch;
    raise exception 'FAIL: anon could read inquiry_last_touch';
  exception when insufficient_privilege then
    raise notice 'PASS: anon blocked';
  end;
end $$;

reset role;
do $$ begin raise notice 'ALL CHECKS PASSED'; end $$;
rollback;
