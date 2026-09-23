-- PUB-AUT-01 collects a phone number at sign-up; keep it in the private account settings.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ph text := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9+]', '', 'g'), '');
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''), 120));
  insert into public.account_settings (user_id, phone) values (new.id, left(ph, 32));
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
