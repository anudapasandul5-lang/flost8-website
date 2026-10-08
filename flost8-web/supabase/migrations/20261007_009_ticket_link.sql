-- App publication metadata. No Shows writes, no changes to imported rows.
begin;
alter table public.inquiries add column ticket_link text;
alter table public.inquiries add constraint inquiries_ticket_link_check check (
  ticket_link is null or (length(ticket_link) <= 2000 and ticket_link ~* '^https?://[^[:space:]/?#]+([/?#][^[:space:]]*)?$')
);
alter table public.inquiries add column website_show_id text;

-- Deliberately no inquiry FK: deletion must leave the mapping for website cleanup.
create table public.website_publications (
  inquiry_id uuid primary key,
  show_id text unique check (show_id is null or show_id !~ '^sync:'),
  phase text not null default 'idle' check (phase in ('idle', 'adding')),
  lock_token uuid,
  lock_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.website_publications enable row level security;
revoke all on public.website_publications from anon, authenticated;
grant all on public.website_publications to service_role;

create function public.claim_website_publication(p_id uuid, p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.website_publications;
begin
  insert into public.website_publications(inquiry_id) values(p_id) on conflict do nothing;
  update public.website_publications set lock_token=p_token, lock_until=now()+interval '2 minutes', updated_at=now()
    where inquiry_id=p_id and (lock_token is null or lock_until < now()) returning * into r;
  if not found then return null; end if;
  return to_jsonb(r);
end;
$$;

create function public.finish_website_publication(p_id uuid, p_token uuid, p_show_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.website_publications set show_id=p_show_id, phase='idle', updated_at=now()
    where inquiry_id=p_id and lock_token=p_token and lock_until > now();
  if not found then raise exception 'Publication claim expired'; end if;
  update public.inquiries set website_show_id=p_show_id where id=p_id and website_show_id is distinct from p_show_id;
end;
$$;
revoke all on function public.claim_website_publication(uuid,uuid) from public, anon, authenticated;
revoke all on function public.finish_website_publication(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.claim_website_publication(uuid,uuid) to service_role;
grant execute on function public.finish_website_publication(uuid,uuid,text) to service_role;

-- The display copy is server-owned; clients cannot forge an association to an admin show.
create function public.guard_website_show_id() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.role() in ('anon', 'authenticated') and
    ((TG_OP='INSERT' and new.website_show_id is not null) or
     (TG_OP='UPDATE' and new.website_show_id is distinct from old.website_show_id)) then
    raise exception 'Website publication metadata is server-owned' using errcode='42501';
  end if;
  return new;
end;
$$;
create trigger inquiries_guard_website_show_id before insert or update on public.inquiries
  for each row execute function public.guard_website_show_id();
commit;
