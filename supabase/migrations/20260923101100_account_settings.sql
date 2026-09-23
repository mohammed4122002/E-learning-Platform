-- Private account fields must not be readable through public profiles. Move them to an owner-only table.
-- (The profile columns were introduced by the identity migration and hold no data yet.)

create table public.account_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (char_length(phone) <= 32),
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  -- GEN-ACC-01 · ٣ الإشعارات: { "<event>": { "email": bool, "in_app": bool } }
  notification_prefs jsonb not null default '{}'::jsonb,
  -- GEN-ACC-01 · ٤ الخصوصية والبيانات
  show_certificates boolean not null default true,
  show_learning_record boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.account_settings enable row level security;
create policy account_settings_own on public.account_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger account_settings_touch before update on public.account_settings
  for each row execute function public.touch_updated_at();

alter table public.profiles drop column phone, drop column locale, drop column notification_prefs;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''));
  insert into public.account_settings (user_id) values (new.id);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

insert into public.account_settings (user_id) select id from public.profiles on conflict do nothing;
