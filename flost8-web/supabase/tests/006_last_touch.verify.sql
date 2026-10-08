-- Verifies migration 006 (inquiry_last_touch view + activity_comment can_view check).
-- Run AFTER applying 006, as one script (Supabase SQL editor or Composio). It rolls back at the end,
-- so it leaves nothing behind.
-- A failed check raises 'FAIL: ...' and aborts. Success returns one row: ALL CHECKS PASSED.
-- Run BEFORE 006 and it must fail (no view; the stranger comment is not blocked) - failing test first.

begin;

-- Uses the real owner and Nirbheeth auth users (managers.user_id); nothing is inserted except one rolled-back comment.

-- Ground truth, computed as the table owner before any role switch.
create temp table facts as
select
  (select user_id from public.managers where role = 'owner') as owner_uid,
  (select user_id from public.managers where name = 'Nirbheeth') as nirb_uid,
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
select set_config('request.jwt.claims', json_build_object('sub', (select owner_uid from facts), 'role', 'authenticated')::text, true);
do $$ begin
  if (select count(*) from public.inquiry_last_touch) <> (select total from facts) then
    raise exception 'FAIL: owner should see % last_touch rows, saw %', (select total from facts), (select count(*) from public.inquiry_last_touch);
  end if;
end $$;

-- 2. Nirbheeth sees only his own inquiries (plan says 6), never one he cannot see.
select set_config('request.jwt.claims', json_build_object('sub', (select nirb_uid from facts), 'role', 'authenticated')::text, true);
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
rollback;
select 'ALL CHECKS PASSED' as result;
