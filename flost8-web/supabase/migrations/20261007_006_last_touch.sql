-- "Last touch" per inquiry, for the /manage needs-action flags (no_reply, quote_quiet), plus a security fix.
--
-- inquiry_last_touch: the later of inquiries.updated_at and the newest comment/status activity row.
-- security_invoker = true, so the caller's own RLS on inquiries and activity applies: a manager only
-- ever gets rows for inquiries they can_view(). Nothing is written to inquiries, so the
-- protect-sheet-rows trigger and the importer's no-op suppression are untouched.
--
-- Security fix: activity_comment (migration 001) never checked can_view(inquiry_id), so any manager
-- could comment on an inquiry they cannot see if they knew its id. Now they cannot.

create view public.inquiry_last_touch with (security_invoker = true) as
  select i.id as inquiry_id,
         greatest(i.updated_at, coalesce(max(a.created_at) filter (where a.kind in ('comment', 'status')), i.updated_at)) as last_touch
    from public.inquiries i
    left join public.activity a on a.inquiry_id = i.id
   group by i.id, i.updated_at;

revoke all on public.inquiry_last_touch from public, anon;
grant  select on public.inquiry_last_touch to authenticated;

drop policy activity_comment on public.activity;
create policy activity_comment on public.activity for insert to authenticated
  with check (
    public.is_manager()
    and kind = 'comment'
    and actor_id = public.current_manager_id()
    and public.can_view(inquiry_id)
  );
