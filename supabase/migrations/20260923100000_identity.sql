-- Identity: profiles, workspaces (PUB-CTX-01), organizations, platform roles.

create extension if not exists pgcrypto with schema extensions;

create type public.workspace_kind as enum ('trainee', 'trainer', 'provider', 'studio', 'requester', 'admin');
create type public.organization_kind as enum ('provider', 'studio', 'requester');
create type public.review_status as enum ('pending', 'verified', 'needs_changes', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  avatar_path text,
  headline text check (char_length(headline) <= 160),
  bio text check (char_length(bio) <= 2000),
  city text check (char_length(city) <= 80),
  phone text check (char_length(phone) <= 32),
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  identity_status public.review_status,
  is_public boolean not null default true,
  notification_prefs jsonb not null default '{}'::jsonb,
  frozen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  kind public.organization_kind not null,
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  logo_path text,
  city text,
  verification_status public.review_status not null default 'pending',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- A user can hold up to four workspaces ("حتى أربع مساحات في آنٍ واحد").
create table public.user_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.workspace_kind not null,
  organization_id uuid references public.organizations (id) on delete cascade,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, kind, organization_id)
);
create index user_workspaces_user_idx on public.user_workspaces (user_id);

create or replace function public.limit_workspaces() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kind <> 'admin' and (
    select count(*) from public.user_workspaces w where w.user_id = new.user_id and w.kind <> 'admin'
  ) >= 4 then
    raise exception 'workspace_limit' using errcode = 'P0001', hint = 'يمكن امتلاك أربع مساحات كحد أقصى.';
  end if;
  return new;
end $$;
create trigger user_workspaces_limit before insert on public.user_workspaces
  for each row execute function public.limit_workspaces();

-- Helpers used by RLS. security definer so policies do not recurse through RLS.
create or replace function public.has_workspace(k public.workspace_kind) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_workspaces w where w.user_id = auth.uid() and w.kind = k);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_workspace('admin');
$$;

create or replace function public.is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m where m.organization_id = org and m.user_id = auth.uid());
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create a profile for every new auth user. The full name comes from sign-up metadata.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may not escalate their own sensitive fields.
create or replace function public.protect_profile_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- auth.uid() is null for service-role / scheduled jobs, which are trusted.
  if auth.uid() is not null and not public.is_admin() then
    new.identity_status := old.identity_status;
    new.frozen_at := old.frozen_at;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();
