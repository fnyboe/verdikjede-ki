-- ============================================================
-- 002_update_handle_new_user.sql
-- Utvid trigger til å lese rolle og company_id frå invitasjonsmetadata
-- Køyr denne i Supabase SQL Editor
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    (new.raw_user_meta_data->>'company_id')::uuid
  );
  return new;
end;
$$;
