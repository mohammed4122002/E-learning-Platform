-- Catalog: categories, programs (+ frozen versions, BR-L1/BR-L2), courses (BR-L3), modules/lessons, sessions.

create type public.course_mode as enum ('in_person', 'live_remote', 'recorded');
create type public.program_status as enum ('draft', 'published', 'archived');
create type public.course_status as enum ('draft', 'open', 'in_progress', 'completed', 'cancelled');
create type public.course_level as enum ('beginner', 'intermediate', 'advanced');
create type public.lesson_kind as enum ('video', 'text', 'file', 'quiz');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  position int not null default 0
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  title text not null check (char_length(title) between 3 and 200),
  summary text,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  level public.course_level not null default 'beginner',
  owner_id uuid not null references public.profiles (id) on delete restrict,
  organization_id uuid references public.organizations (id) on delete restrict,
  status public.program_status not null default 'draft',
  current_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger programs_touch before update on public.programs
  for each row execute function public.touch_updated_at();

-- BR-L1: a course is bound to an immutable snapshot of its program.
create table public.program_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete restrict,
  version int not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (program_id, version)
);
create or replace function public.forbid_update() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'immutable_row' using errcode = 'P0001'; end $$;
create trigger program_versions_immutable before update on public.program_versions
  for each row execute function public.forbid_update();

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,140}$'),
  program_id uuid not null references public.programs (id) on delete restrict,
  program_version_id uuid not null references public.program_versions (id) on delete restrict,
  trainer_id uuid not null references public.profiles (id) on delete restrict,
  organization_id uuid references public.organizations (id) on delete restrict,
  title text not null check (char_length(title) between 3 and 200),
  summary text,
  mode public.course_mode not null,
  level public.course_level not null default 'beginner',
  cover_path text,
  cover_crop jsonb,
  city text,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  duration_hours numeric(6, 1) check (duration_hours >= 0),
  capacity int check (capacity > 0),
  min_capacity int check (min_capacity >= 0),
  price numeric(10, 2) not null default 0 check (price >= 0),
  currency text not null default 'SAR' check (currency ~ '^[A-Z]{3}$'),
  price_locked_at timestamptz,
  requires_provider_approval boolean not null default false,
  status public.course_status not null default 'draft',
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  learners_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at),
  check (mode = 'recorded' or capacity is not null)
);
create index courses_status_idx on public.courses (status);
create index courses_program_idx on public.courses (program_id);
create index courses_trainer_idx on public.courses (trainer_id);
create trigger courses_touch before update on public.courses
  for each row execute function public.touch_updated_at();

-- BR-L3: price is locked after the first paid enrollment.
create or replace function public.guard_course_price() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.price_locked_at is not null and (new.price <> old.price or new.currency <> old.currency) then
    raise exception 'price_locked' using errcode = 'P0001',
      hint = 'السعر مقفل بعد أول تسجيل مدفوع. أنشئ دورة جديدة لتغييره.';
  end if;
  if new.program_version_id <> old.program_version_id and old.status <> 'draft' then
    raise exception 'program_version_frozen' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger courses_guard before update on public.courses
  for each row execute function public.guard_course_price();

-- محاور (modules) → دروس (lessons) → مواد (materials), per BR-U1.
create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position int not null,
  title text not null,
  unique (course_id, position)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid not null references public.course_modules (id) on delete cascade,
  position int not null,
  title text not null,
  kind public.lesson_kind not null default 'video',
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  media_path text,
  body text,
  is_preview boolean not null default false,
  published_at timestamptz default now(),
  created_at timestamptz not null default now(),
  unique (module_id, position)
);
create index lessons_course_idx on public.lessons (course_id);

create table public.course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position int not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  meeting_url text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  unique (course_id, position),
  check (ends_at > starts_at)
);
create index course_sessions_course_idx on public.course_sessions (course_id, starts_at);

