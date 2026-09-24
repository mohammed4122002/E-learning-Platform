-- Profile views for the trainer sidebar card (TRR-DSH-01 profile-card · «eye» count).
-- One row per viewer per profile per day; the owner's own visits are not counted.
create table public.profile_views (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  viewer_key text not null,
  viewed_on date not null default (now() at time zone 'Asia/Riyadh')::date,
  primary key (profile_id, viewer_key, viewed_on)
);
alter table public.profile_views enable row level security;
-- No direct access: rows are written by record_profile_view and read through profile_view_count.

create or replace function public.record_profile_view(p_profile uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is not null and viewer = p_profile then return; end if;
  insert into public.profile_views (profile_id, viewer_key)
  values (p_profile, coalesce(viewer::text, 'anon'))
  on conflict do nothing;
end $$;

create or replace function public.profile_view_count()
returns bigint language sql stable security definer set search_path = '' as $$
  select count(*) from public.profile_views where profile_id = public.require_user();
$$;

revoke all on function public.record_profile_view(uuid) from public;
revoke all on function public.profile_view_count() from public;
grant execute on function public.record_profile_view(uuid) to anon, authenticated;
grant execute on function public.profile_view_count() to authenticated;
