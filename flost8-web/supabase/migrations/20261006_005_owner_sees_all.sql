-- Only the owner sees every inquiry (and so every artist's money). A manager sees an inquiry only when
-- they own it or it involves one of their artists. Money rules (can_see_money) are unchanged and now
-- sit on top of this, so a manager can never see money on an inquiry they cannot see.

create function public.can_view(i uuid) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select public.is_owner()
      or exists (select 1 from public.inquiries q where q.id = i and q.owner_id = public.current_manager_id())
      or exists (
        select 1 from public.inquiry_artists ia
        join public.artists a on a.slug = ia.artist_slug
        where ia.inquiry_id = i and a.manager_id = public.current_manager_id()
      )
  $$;

revoke execute on function public.can_view(uuid) from public, anon;
grant  execute on function public.can_view(uuid) to authenticated;

drop policy inquiries_read on public.inquiries;
create policy inquiries_read on public.inquiries for select to authenticated using (public.can_view(id));

drop policy ia_read on public.inquiry_artists;
create policy ia_read on public.inquiry_artists for select to authenticated using (public.can_view(inquiry_id));

drop policy activity_read on public.activity;
create policy activity_read on public.activity for select to authenticated using (public.can_view(inquiry_id));
