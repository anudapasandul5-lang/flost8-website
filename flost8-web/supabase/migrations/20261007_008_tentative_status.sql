-- Adds the 'tentative' status: a date someone is holding but nothing is agreed yet.
-- The inline check from 001 has the default name inquiries_status_check; the replacement allows the same values plus 'tentative'.
-- Nothing else changes: existing rows keep their status, RLS is untouched.

alter table public.inquiries drop constraint inquiries_status_check;
alter table public.inquiries add constraint inquiries_status_check
  check (status in ('new','reached_out','quoted','tentative','deposit_paid','booking_confirmed','lost','spam'));
