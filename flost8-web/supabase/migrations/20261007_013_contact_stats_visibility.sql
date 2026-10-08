-- FLOST8 /manage: contact_stats counted every inquiry linked to a contact, including ones the caller cannot see.
-- NOT APPLIED. Needs the owner's OK. Same signature, so the existing grant (authenticated) stays.
--
-- Since migration 005 a sales manager sees an inquiry only when they own it or it carries one of their artists.
-- contact_stats is security definer, so it bypassed that: a manager learned how many shows another manager's artists
-- have with a shared contact, the next booked date, and when that inquiry was last touched. Each inquiry is now counted
-- only when can_view() says the caller may see it. The owner still sees everything (can_view is true for the owner).
-- Proof: supabase/proofs/phase2_security.proof.mjs ("contact_stats does not reveal ...").

begin;

create or replace function public.contact_stats(p_today date)
returns table (contact_id uuid, any_count int, booked_count int, next_booked_date date, last_booked_date date,
               last_inquiry_touch timestamptz, last_note_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id,
         count(i.id) filter (where i.status not in ('lost', 'spam'))::int,
         count(i.id) filter (where i.status in ('booking_confirmed', 'deposit_paid'))::int,
         min(i.event_date) filter (where i.status in ('booking_confirmed', 'deposit_paid') and i.event_date >= p_today),
         max(i.event_date) filter (where i.status in ('booking_confirmed', 'deposit_paid') and i.event_date < p_today),
         max(i.updated_at),
         (select max(n.created_at) from public.contact_notes n where n.contact_id = c.id)
    from public.contacts c
    left join public.inquiries i on i.contact_id = c.id and public.can_view(i.id)
   where public.is_manager() and c.deleted_at is null
   group by c.id
$$;

commit;
