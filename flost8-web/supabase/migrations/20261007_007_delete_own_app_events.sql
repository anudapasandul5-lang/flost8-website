-- Managers can delete events they added in the app. Until now only the owner role could delete (inquiries_delete).
-- A second PERMISSIVE policy is ORed with that one: a manager may delete a row only when it was added in the app
-- (source 'manual') and they own it. Sheet-imported and website rows stay undeletable for managers.
-- Deleting cascades to inquiry_artists, inquiry_money, activity and reminders (all declared ON DELETE CASCADE).

create policy inquiries_delete_own_app on public.inquiries for delete to authenticated
  using (source = 'manual' and owner_id = public.current_manager_id());
