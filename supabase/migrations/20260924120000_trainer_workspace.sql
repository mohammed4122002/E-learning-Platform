-- Trainer workspace (TRR-ONB / DSH / JRN / QUE / PRF / CAL). Additive only: new tables, one public bucket,
-- read-model RPCs over existing catalog/enrollment/payment data, and one write RPC with business rules.

-- ─── Trainer profile + onboarding answers (TRR-ONB-01, TRR-PRF-01/02) ───────────────────────────────────
create table public.trainer_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  specialties text[] not null default '{}'
    check (specialties <@ array['management', 'technology', 'marketing', 'design', 'finance', 'hr', 'safety', 'soft-skills']::text[]),
  experience_band text check (experience_band in ('lt2', '2to5', '6to10', 'gt10')),
  delivery_modes public.course_mode[] not null default '{}',
  audience text check (audience in ('individuals', 'organizations', 'both')),
  goal text check (goal in ('extra_income', 'org_opportunities', 'reputation', 'full_time')),
  onboarding_step integer not null default 1 check (onboarding_step between 1 and 6),
  onboarding_completed_at timestamptz,
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  skills text[] not null default '{}' check (cardinality(skills) <= 20),
  cv_path text,
  cv_name text,
  cv_size integer,
  hidden_program_ids uuid[] not null default '{}',
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Credentials (الاعتمادات والمؤهلات). verified_at is set by the platform only. ────────────────────────
create table public.trainer_qualifications (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('academic', 'professional')),
  title text not null check (char_length(title) between 2 and 160),
  issuer text not null check (char_length(issuer) between 2 and 160),
  year integer check (year between 1950 and 2100),
  file_path text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index trainer_qualifications_trainer_idx on public.trainer_qualifications (trainer_id, created_at);

-- ─── Portfolio (TRR-PRF-03 معرض الأعمال) ───────────────────────────────────────────────────────────────────
create table public.trainer_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('delivered', 'material', 'program')),
  title text not null check (char_length(title) between 3 and 140),
  organization text check (char_length(organization) <= 120),
  happened_on date,
  duration_days integer check (duration_days between 1 and 365),
  trainees_count integer check (trainees_count between 1 and 100000),
  courses_count integer check (courses_count between 1 and 1000),
  page_count integer check (page_count between 1 and 5000),
  file_format text check (char_length(file_format) <= 12),
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trainer_portfolio_items_trainer_idx on public.trainer_portfolio_items (trainer_id, created_at);

-- ─── Personal calendar (TRR-CAL-01/02). Course sessions come from course_sessions. ─────────────────────
create table public.trainer_calendar_events (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('personal', 'leave', 'external')),
  title text not null check (char_length(title) between 2 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  recurrence text not null default 'none' check (recurrence in ('none', 'weekly', 'biweekly', 'monthly')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index trainer_calendar_events_trainer_idx on public.trainer_calendar_events (trainer_id, starts_at);

-- ─── RLS ─────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.trainer_profiles enable row level security;
alter table public.trainer_qualifications enable row level security;
alter table public.trainer_portfolio_items enable row level security;
alter table public.trainer_calendar_events enable row level security;

-- Public professional data: visible to its owner, and to everyone when the profile is public (PRF-01).
create policy trainer_profiles_read on public.trainer_profiles for select
  using (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = trainer_profiles.user_id and p.is_public));
create policy trainer_profiles_insert on public.trainer_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy trainer_profiles_update on public.trainer_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy trainer_qualifications_read on public.trainer_qualifications for select
  using (trainer_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = trainer_qualifications.trainer_id and p.is_public));
create policy trainer_qualifications_insert on public.trainer_qualifications for insert to authenticated
  with check (trainer_id = (select auth.uid()) and verified_at is null);
create policy trainer_qualifications_update on public.trainer_qualifications for update to authenticated
  using (trainer_id = (select auth.uid()) and verified_at is null)
  with check (trainer_id = (select auth.uid()) and verified_at is null);
create policy trainer_qualifications_delete on public.trainer_qualifications for delete to authenticated
  using (trainer_id = (select auth.uid()) and verified_at is null);

create policy trainer_portfolio_read on public.trainer_portfolio_items for select
  using (trainer_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = trainer_portfolio_items.trainer_id and p.is_public));
create policy trainer_portfolio_insert on public.trainer_portfolio_items for insert to authenticated
  with check (trainer_id = (select auth.uid()));
create policy trainer_portfolio_update on public.trainer_portfolio_items for update to authenticated
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy trainer_portfolio_delete on public.trainer_portfolio_items for delete to authenticated
  using (trainer_id = (select auth.uid()));

-- Personal appointments are private: organizations only ever see "غير متاح" through trainer_busy_days().
create policy trainer_events_read on public.trainer_calendar_events for select to authenticated
  using (trainer_id = (select auth.uid()));
create policy trainer_events_update on public.trainer_calendar_events for update to authenticated
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy trainer_events_delete on public.trainer_calendar_events for delete to authenticated
  using (trainer_id = (select auth.uid()));
-- Inserts go through add_trainer_event() (time-range and conflict rules).

create trigger trainer_profiles_touch before update on public.trainer_profiles
  for each row execute function public.touch_updated_at();
create trigger trainer_portfolio_touch before update on public.trainer_portfolio_items
  for each row execute function public.touch_updated_at();

-- ─── Storage: portfolio images and CV are shown on the public profile → public bucket, owner-folder writes ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trainer-media', 'trainer-media', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "trainer media insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'trainer-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "trainer media update own" on storage.objects for update to authenticated
  using (bucket_id = 'trainer-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'trainer-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "trainer media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'trainer-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Platform commission shown in the income calculator and used for net earnings (TRR-JRN-02).
insert into public.app_settings (key, value) values ('trainer_commission_percent', '10'::jsonb)
on conflict (key) do nothing;

-- ─── Read model: the signed-in trainer's figures that span tables RLS does not expose to trainers ─────────
-- Earnings: net of VAT and platform commission, from succeeded payments on the trainer's own courses.
-- "Available" once the course is completed and 7 days have passed (refund window); otherwise pending.
create or replace function public.trainer_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  commission numeric := coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'trainer_commission_percent'), 10);
  result jsonb;
begin
  with my_courses as (
    select id, status, coalesce(ends_at, updated_at) as ended_at from public.courses where trainer_id = u
  ), paid as (
    select p.created_at, k.status as course_status, k.ended_at,
           (e.price_paid - e.vat_amount) * (1 - commission / 100) as net
    from public.payments p
    join public.enrollments e on e.id = p.enrollment_id
    join my_courses k on k.id = e.course_id
    where p.status = 'succeeded'
  ), active as (
    select e.trainee_id, e.created_at from public.enrollments e
    join my_courses k on k.id = e.course_id
    where e.status in ('confirmed', 'in_progress')
  ), rated as (
    select r.* from public.course_ratings r join my_courses k on k.id = r.course_id
  )
  select jsonb_build_object(
    'commission_percent', commission,
    'available', coalesce((select sum(net) from paid where course_status = 'completed' and ended_at < now() - interval '7 days'), 0),
    'pending', coalesce((select sum(net) from paid where not (course_status = 'completed' and ended_at < now() - interval '7 days')), 0),
    'month_total', coalesce((select sum(net) from paid where created_at >= date_trunc('month', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh'), 0),
    'three_month_avg', coalesce((select sum(net) / 3 from paid where created_at >= now() - interval '90 days'), 0),
    'first_payment_at', (select min(created_at) from paid),
    'active_trainees', (select count(distinct trainee_id) from active),
    'new_trainees_month', (select count(distinct trainee_id) from active where created_at >= date_trunc('month', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh'),
    'first_enrollment_at', (select min(e.created_at) from public.enrollments e join my_courses k on k.id = e.course_id
                            where e.status in ('confirmed', 'in_progress', 'completed')),
    'rating_count', (select count(*) from rated),
    'rating_trainer', (select round(avg(trainer_score)::numeric, 1) from rated),
    'rating_content', (select round(avg(content_score)::numeric, 1) from rated),
    'rating_organization', (select round(avg(organization_score)::numeric, 1) from rated),
    'low_ratings', (select count(*) from rated where trainer_score <= 3 and created_at > now() - interval '30 days'),
    'platform_rating_avg', (select round(avg(trainer_score)::numeric, 1) from public.course_ratings)
  ) into result;
  return result;
end $$;

-- Platform averages per course mode in the trainer's specialties (income calculator). Null when no data yet.
create or replace function public.trainer_income_benchmarks() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  fields text[] := coalesce((select specialties from public.trainer_profiles where user_id = u), '{}');
  result jsonb;
begin
  with revenue as (
    select k.id, k.mode, c.field_slug, sum(e.price_paid - e.vat_amount) as gross, count(*) as sales
    from public.courses k
    join public.programs g on g.id = k.program_id
    left join public.categories c on c.id = g.category_id
    join public.enrollments e on e.course_id = k.id
    join public.payments p on p.enrollment_id = e.id and p.status = 'succeeded'
    group by k.id, k.mode, c.field_slug
  ), scoped as (
    select * from revenue where cardinality(fields) = 0 or field_slug = any (fields)
      or not exists (select 1 from revenue r where r.field_slug = any (fields))
  )
  select jsonb_build_object(
    'in_person_per_course', (select round(avg(gross), 2) from scoped where mode = 'in_person'),
    'live_per_course', (select round(avg(gross), 2) from scoped where mode = 'live_remote'),
    'recorded_per_sale', (select round(sum(gross) / nullif(sum(sales), 0), 2) from scoped where mode = 'recorded')
  ) into result;
  return result;
end $$;

-- Days an organization sees as "غير متاح" (no titles, kinds or reasons) — PRF-01 «متى يكون المدرب متاحًا؟».
create or replace function public.trainer_busy_days(p_trainer uuid, p_from date, p_days integer default 7)
returns table (day date, busy boolean)
language sql stable security definer set search_path = '' as $$
  select d::date,
         exists (select 1 from public.trainer_calendar_events ev
                 where ev.trainer_id = p_trainer and ev.recurrence = 'none'
                   and (ev.starts_at at time zone 'Asia/Riyadh')::date <= d::date
                   and (ev.ends_at at time zone 'Asia/Riyadh')::date >= d::date)
      or exists (select 1 from public.course_sessions s join public.courses k on k.id = s.course_id
                 where k.trainer_id = p_trainer and k.status in ('open', 'in_progress')
                   and (s.starts_at at time zone 'Asia/Riyadh')::date = d::date)
  from generate_series(p_from, p_from + greatest(least(p_days, 60), 1) - 1, interval '1 day') d
  where exists (select 1 from public.profiles p where p.id = p_trainer and (p.is_public or p.id = auth.uid()));
$$;

-- TRR-CAL-02: add a personal appointment / leave / outside training. Rejects inverted ranges and overlaps with
-- the trainer's scheduled course sessions (the schedule the platform owns).
create or replace function public.add_trainer_event(
  p_kind text, p_title text, p_starts timestamptz, p_ends timestamptz, p_all_day boolean, p_recurrence text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  new_id uuid;
begin
  if not exists (select 1 from public.user_workspaces w where w.user_id = u and w.kind = 'trainer') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_kind not in ('personal', 'leave', 'external') or p_recurrence not in ('none', 'weekly', 'biweekly', 'monthly')
     or p_title is null or char_length(trim(p_title)) not between 2 and 120 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_starts is null or p_ends is null or p_ends <= p_starts then
    raise exception 'invalid_time_range' using errcode = 'P0001';
  end if;
  if p_ends - p_starts > interval '60 days' then
    raise exception 'event_too_long' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.course_sessions s join public.courses k on k.id = s.course_id
             where k.trainer_id = u and k.status in ('open', 'in_progress') and s.status <> 'cancelled'
               and s.starts_at < p_ends and s.ends_at > p_starts) then
    raise exception 'calendar_conflict' using errcode = 'P0001';
  end if;
  insert into public.trainer_calendar_events (trainer_id, kind, title, starts_at, ends_at, all_day, recurrence)
  values (u, p_kind, trim(p_title), p_starts, p_ends, coalesce(p_all_day, false), p_recurrence)
  returning id into new_id;
  return new_id;
end $$;

revoke all on function public.trainer_stats() from public, anon;
revoke all on function public.trainer_income_benchmarks() from public, anon;
revoke all on function public.trainer_busy_days(uuid, date, integer) from public, anon;
revoke all on function public.add_trainer_event(text, text, timestamptz, timestamptz, boolean, text) from public, anon;
grant execute on function
  public.trainer_stats(),
  public.trainer_income_benchmarks(),
  public.trainer_busy_days(uuid, date, integer),
  public.add_trainer_event(text, text, timestamptz, timestamptz, boolean, text)
to authenticated;
