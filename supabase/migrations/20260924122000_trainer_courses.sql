-- Trainer workspace · courses (TRR-CRS-01…09): creating a course from a published program version (BR-L1),
-- the setup wizard, content authoring (modules → lessons → materials, quizzes, assignments, course files),
-- publishing rules, new-content publishing (BR-L10), sales read model and pause-sales.
-- Additive only: new nullable/defaulted columns, one new table, policies, triggers and RPCs.

-- ── Columns ────────────────────────────────────────────────────────────────────────────────────────
alter table public.courses
  add column if not exists meeting_platform text check (meeting_platform in ('zoom', 'google_meet', 'other')),
  add column if not exists record_sessions boolean not null default false,
  add column if not exists live_questions boolean not null default false,
  add column if not exists auto_attendance boolean not null default false,
  add column if not exists waitlist_enabled boolean not null default true,
  add column if not exists lifetime_access boolean not null default true,
  add column if not exists allow_downloads boolean not null default true,
  add column if not exists certificate_on_completion boolean not null default true,
  -- Step ٤ was saved (a price, or «مجانية», was chosen deliberately).
  add column if not exists pricing_set_at timestamptz,
  add column if not exists sales_paused_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists page_views int not null default 0 check (page_views >= 0);

-- Axes copied from the program snapshot are locked in the course (TRR-CRS-05 ٢ «المحاور موروثة»).
alter table public.course_modules add column if not exists from_program boolean not null default false;

-- Each session covers one axis (TRR-CRS-05 ٢ المحاور والجلسات).
alter table public.course_sessions add column if not exists module_id uuid references public.course_modules (id) on delete set null;
create index if not exists course_sessions_module_id_fk_idx on public.course_sessions (module_id);

-- Uploaded material facts shown in the content editor and the files tab.
alter table public.lessons
  add column if not exists media_size bigint check (media_size >= 0),
  add column if not exists media_type text;

-- Live meeting link: readable by course staff only (enrolled trainees get it through join_live_session).
create table if not exists public.course_private (
  course_id uuid primary key references public.courses (id) on delete cascade,
  meeting_url text check (meeting_url is null or meeting_url ~ '^https://'),
  updated_at timestamptz not null default now()
);
alter table public.course_private enable row level security;
create policy course_private_staff on public.course_private for select
  using (public.manages_course(course_id) or public.is_admin());

-- Course-specific files (TRR-CRS-05 ٣ «مواد خاصة بهذه الدورة»): drafts are visible to staff only.
create table if not exists public.course_files (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  file_path text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  mime_type text,
  published_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists course_files_course_id_fk_idx on public.course_files (course_id);
create index if not exists course_files_created_by_fk_idx on public.course_files (created_by);
alter table public.course_files enable row level security;
create policy course_files_read on public.course_files for select
  using (public.manages_course(course_id) or (published_at is not null and public.is_enrolled(course_id)) or public.is_admin());
create policy course_files_insert on public.course_files for insert
  with check (public.manages_course(course_id) and created_by = (select auth.uid())
              and split_part(file_path, '/', 1) = course_id::text);
create policy course_files_update on public.course_files for update
  using (public.manages_course(course_id))
  with check (public.manages_course(course_id) and split_part(file_path, '/', 1) = course_id::text);
create policy course_files_delete on public.course_files for delete using (public.manages_course(course_id));

-- Platform commission (Figma «عمولة المنصة ١٠٪ · قيمة تشغيلية مؤقتة وفق إعدادات المنصة»).
insert into public.app_settings (key, value) values ('platform_commission_percent', '10'::jsonb)
on conflict (key) do nothing;

create or replace function public.platform_commission_percent() returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'platform_commission_percent'), 10);
$$;

-- ── Content write policies (course staff) ─────────────────────────────────────────────────────────
create policy course_modules_insert on public.course_modules for insert
  with check (public.manages_course(course_id) and not from_program);
create policy course_modules_update on public.course_modules for update
  using (public.manages_course(course_id)) with check (public.manages_course(course_id));
create policy course_modules_delete on public.course_modules for delete
  using (public.manages_course(course_id) and not from_program);

create policy lessons_insert on public.lessons for insert with check (public.manages_course(course_id));
create policy lessons_update on public.lessons for update
  using (public.manages_course(course_id)) with check (public.manages_course(course_id));
create policy lessons_delete on public.lessons for delete using (public.manages_course(course_id));

create policy quizzes_insert on public.quizzes for insert with check (public.manages_course(course_id));
create policy quizzes_update on public.quizzes for update
  using (public.manages_course(course_id)) with check (public.manages_course(course_id));
create policy quizzes_delete on public.quizzes for delete using (public.manages_course(course_id));

create policy assignments_insert on public.assignments for insert with check (public.manages_course(course_id));
create policy assignments_update on public.assignments for update
  using (public.manages_course(course_id)) with check (public.manages_course(course_id));
create policy assignments_delete on public.assignments for delete
  using (public.manages_course(course_id)
         and not exists (select 1 from public.assignment_submissions s where s.assignment_id = assignments.id));

-- ── Content guards ─────────────────────────────────────────────────────────────────────────────────
-- Modules: program axes keep their title; positions stay unique per course (handled by the unique key).
create or replace function public.guard_course_module() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.course_id <> old.course_id then raise exception 'invalid_input' using errcode = 'P0001'; end if;
    if old.from_program and (new.title <> old.title or not new.from_program)
       and coalesce(current_setting('app.trusted_op', true), '') <> 'on' then
      raise exception 'module_locked' using errcode = 'P0001';
    end if;
  end if;
  if char_length(trim(new.title)) < 2 or char_length(new.title) > 200 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger course_modules_guard before insert or update on public.course_modules
  for each row execute function public.guard_course_module();

-- Lessons: must sit in a module of the same course. In a published course a new lesson starts as a draft
-- (published_at null) and only publish_new_content() releases it — BR-L10 (purchasers are told, progress is
-- recomputed). Publication state never changes through a direct update.
create or replace function public.guard_lesson() returns trigger
language plpgsql set search_path = '' as $$
declare st public.course_status; trusted boolean := coalesce(current_setting('app.trusted_op', true), '') = 'on';
begin
  if not exists (select 1 from public.course_modules m where m.id = new.module_id and m.course_id = new.course_id) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if char_length(trim(new.title)) < 2 or char_length(new.title) > 200 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if new.media_path is not null and split_part(new.media_path, '/', 1) <> new.course_id::text then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  select status into st from public.courses where id = new.course_id;
  if tg_op = 'INSERT' then
    if not trusted then
      new.published_at := case when st = 'draft' then now() else null end;
    end if;
  else
    if new.course_id <> old.course_id then raise exception 'invalid_input' using errcode = 'P0001'; end if;
    if not trusted then new.published_at := old.published_at; end if;
  end if;
  return new;
end $$;
create trigger lessons_guard before insert or update on public.lessons
  for each row execute function public.guard_lesson();

-- Published lessons of a published course that trainees already started cannot be deleted (their progress
-- and certificates depend on them); drafts and lessons of draft courses can.
create or replace function public.guard_lesson_delete() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.published_at is not null
     and exists (select 1 from public.courses c where c.id = old.course_id and c.status <> 'draft')
     and exists (select 1 from public.lesson_progress p where p.lesson_id = old.id) then
    raise exception 'content_in_use' using errcode = 'P0001';
  end if;
  return old;
end $$;
create trigger lessons_guard_delete before delete on public.lessons
  for each row execute function public.guard_lesson_delete();

-- Quizzes: [{ id, text, options[2..6], answer }] with a valid answer index; linked lesson must be a quiz lesson
-- of the same course.
create or replace function public.guard_quiz() returns trigger
language plpgsql set search_path = '' as $$
declare q jsonb; n int;
begin
  if jsonb_typeof(new.questions) <> 'array' or jsonb_array_length(new.questions) > 100 then
    raise exception 'invalid_quiz' using errcode = 'P0001';
  end if;
  for q in select * from jsonb_array_elements(new.questions) loop
    n := case when jsonb_typeof(q -> 'options') = 'array' then jsonb_array_length(q -> 'options') else 0 end;
    if coalesce(char_length(trim(q ->> 'id')), 0) = 0 or coalesce(char_length(trim(q ->> 'text')), 0) = 0
       or n < 2 or n > 6 or coalesce(jsonb_typeof(q -> 'answer'), '') <> 'number'
       or (q ->> 'answer')::int < 0 or (q ->> 'answer')::int >= n then
      raise exception 'invalid_quiz' using errcode = 'P0001';
    end if;
  end loop;
  if new.lesson_id is not null and not exists (
    select 1 from public.lessons l where l.id = new.lesson_id and l.course_id = new.course_id and l.kind = 'quiz') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger quizzes_guard before insert or update on public.quizzes
  for each row execute function public.guard_quiz();

create or replace function public.guard_assignment() returns trigger
language plpgsql set search_path = '' as $$
begin
  if char_length(trim(new.title)) < 2 or char_length(new.title) > 200 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if new.module_id is not null and not exists (
    select 1 from public.course_modules m where m.id = new.module_id and m.course_id = new.course_id) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.course_id <> old.course_id then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  return new;
end $$;
create trigger assignments_guard before insert or update on public.assignments
  for each row execute function public.guard_assignment();

-- ── Publishing rules ───────────────────────────────────────────────────────────────────────────────
-- Everything that still blocks publishing a course (empty = ready). Codes are shown as the Figma checklist.
create or replace function public.course_publish_blockers(p_course uuid)
returns table (code text, detail text)
language plpgsql stable security definer set search_path = '' as $$
declare c public.courses; url text; bad text;
begin
  select * into c from public.courses where id = p_course;
  if not found or not (public.manages_course(p_course) or public.is_admin()
                       or coalesce(current_setting('app.trusted_op', true), '') = 'on') then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if c.pricing_set_at is null then code := 'price_missing'; detail := null; return next; end if;
  if coalesce(c.duration_hours, 0) <= 0 then code := 'hours_missing'; detail := null; return next; end if;
  if c.mode = 'recorded' then
    if not exists (select 1 from public.lessons l where l.course_id = p_course) then
      code := 'no_content'; detail := null; return next;
    else
      select string_agg('«' || l.title || '»', ' و' order by m.position, l.position) into bad
      from public.lessons l join public.course_modules m on m.id = l.module_id
      where l.course_id = p_course and not (
        (l.kind in ('video', 'file') and l.media_path is not null)
        or (l.kind = 'text' and coalesce(char_length(trim(l.body)), 0) > 0)
        or (l.kind = 'quiz' and exists (select 1 from public.quizzes q where q.lesson_id = l.id and jsonb_array_length(q.questions) > 0)));
      if bad is not null then code := 'lessons_without_material'; detail := bad; return next; end if;
      if not exists (select 1 from public.lessons l where l.course_id = p_course and l.is_preview) then
        code := 'no_preview'; detail := null; return next;
      end if;
    end if;
  else
    if c.capacity is null then code := 'seats_missing'; detail := null; return next; end if;
    if not exists (select 1 from public.course_sessions s where s.course_id = p_course and s.status <> 'cancelled') then
      code := 'schedule_missing'; detail := null; return next;
    end if;
    if c.mode = 'in_person' and coalesce(char_length(trim(c.venue)), 0) = 0 then
      code := 'venue_missing'; detail := null; return next;
    end if;
    if c.mode = 'live_remote' then
      select meeting_url into url from public.course_private where course_id = p_course;
      if url is null or c.meeting_platform is null then code := 'meeting_missing'; detail := null; return next; end if;
    end if;
  end if;
end $$;

-- A draft only becomes purchasable when nothing blocks it — whoever changes the status.
create or replace function public.guard_course_publish() returns trigger
language plpgsql set search_path = '' as $$
declare prev text := coalesce(current_setting('app.trusted_op', true), ''); blocked boolean;
begin
  if old.status = 'draft' and new.status in ('open', 'in_progress') then
    perform set_config('app.trusted_op', 'on', true);
    blocked := exists (select 1 from public.course_publish_blockers(new.id));
    perform set_config('app.trusted_op', prev, true);
    if blocked then
      raise exception 'publish_incomplete' using errcode = 'P0001';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  if new.mode <> old.mode and old.status <> 'draft' then
    raise exception 'mode_locked' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger courses_publish_guard before update on public.courses
  for each row execute function public.guard_course_publish();

-- Paused sales and a disabled waitlist stop new sign-ups at the database level.
create or replace function public.guard_enrollment_sales() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.courses c where c.id = new.course_id and c.sales_paused_at is not null) then
    raise exception 'sales_paused' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger enrollments_sales_guard before insert on public.enrollments
  for each row execute function public.guard_enrollment_sales();

create or replace function public.guard_waitlist_enabled() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.courses c where c.id = new.course_id and not c.waitlist_enabled) then
    raise exception 'waitlist_disabled' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger waitlist_enabled_guard before insert on public.waitlist_entries
  for each row execute function public.guard_waitlist_enabled();

-- ── RPCs ───────────────────────────────────────────────────────────────────────────────────────────
-- TRR-CRS-02: a draft course bound to a published program version (BR-L1). Axes in the snapshot become
-- locked modules. Only the program owner (or a member of its organization) runs it.
create or replace function public.create_course(p_program_version uuid, p_mode public.course_mode, p_title text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  v public.program_versions;
  p public.programs;
  cid uuid;
  ax jsonb;
  i int := 0;
  t text;
begin
  if not public.has_workspace('trainer') then raise exception 'forbidden' using errcode = 'P0001'; end if;
  select * into v from public.program_versions where id = p_program_version;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into p from public.programs where id = v.program_id;
  if p.status <> 'published' then raise exception 'program_not_published' using errcode = 'P0001'; end if;
  if not (p.owner_id = u or (p.organization_id is not null and public.is_org_member(p.organization_id))) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  t := coalesce(nullif(trim(p_title), ''), v.snapshot ->> 'title', p.title);
  insert into public.courses (slug, program_id, program_version_id, trainer_id, organization_id, title, summary, mode, level,
                              capacity, currency, status, meeting_platform)
  values (
    left(p.slug, 120) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    p.id, v.id, u, p.organization_id, left(t, 200),
    coalesce(v.snapshot ->> 'summary', p.summary), p_mode, p.level,
    case when p_mode = 'recorded' then null else 20 end, 'SAR', 'draft',
    case when p_mode = 'live_remote' then 'zoom' end)
  returning id into cid;
  insert into public.course_private (course_id) values (cid);

  for ax in select * from jsonb_array_elements(
      case when jsonb_typeof(v.snapshot -> 'modules') = 'array' then v.snapshot -> 'modules'
           when jsonb_typeof(v.snapshot -> 'axes') = 'array' then v.snapshot -> 'axes'
           else '[]'::jsonb end) loop
    t := case when jsonb_typeof(ax) = 'string' then ax #>> '{}' else ax ->> 'title' end;
    if coalesce(char_length(trim(t)), 0) >= 2 then
      i := i + 1;
      insert into public.course_modules (course_id, position, title, from_program) values (cid, i, left(trim(t), 200), true);
    end if;
  end loop;
  return cid;
end $$;

-- TRR-CRS-02 steps ٢–٤ and the editable «بيانات هذه الدورة»: one patch per autosave.
-- Draft courses accept every field; published ones only what does not change the purchase contract.
create or replace function public.update_course_setup(p_course uuid, p_patch jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  c public.courses;
  draft boolean;
  k text;
  new_price numeric;
  allowed text[] := array['title', 'mode', 'city', 'venue', 'duration_hours', 'capacity', 'min_capacity', 'price', 'pricing_set',
                          'meeting_platform', 'meeting_url', 'record_sessions', 'live_questions', 'auto_attendance',
                          'waitlist_enabled', 'lifetime_access', 'allow_downloads', 'certificate_on_completion'];
  published_ok text[] := array['city', 'venue', 'price', 'meeting_platform', 'meeting_url', 'record_sessions', 'live_questions',
                               'auto_attendance', 'waitlist_enabled', 'allow_downloads', 'certificate_on_completion'];
begin
  select * into c from public.courses where id = p_course for update;
  if not found or not public.manages_course(p_course) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if c.status in ('completed', 'cancelled') then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_patch) <> 'object' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  draft := c.status = 'draft';
  for k in select jsonb_object_keys(p_patch) loop
    if not (k = any(allowed)) then raise exception 'invalid_input' using errcode = 'P0001'; end if;
    if not draft and not (k = any(published_ok)) then raise exception 'field_locked' using errcode = 'P0001'; end if;
  end loop;

  if p_patch ? 'mode' and (p_patch ->> 'mode')::public.course_mode <> c.mode then
    -- Switching mode resets what belonged to the previous one.
    delete from public.course_sessions where course_id = p_course;
    update public.courses set mode = (p_patch ->> 'mode')::public.course_mode,
      capacity = case when (p_patch ->> 'mode') = 'recorded' then null else coalesce(c.capacity, 20) end,
      min_capacity = case when (p_patch ->> 'mode') = 'recorded' then null else c.min_capacity end,
      starts_at = null, ends_at = null,
      meeting_platform = case when (p_patch ->> 'mode') = 'live_remote' then coalesce(c.meeting_platform, 'zoom') else c.meeting_platform end
    where id = p_course;
    select * into c from public.courses where id = p_course;
  end if;

  if p_patch ? 'price' then
    new_price := round((p_patch ->> 'price')::numeric, 2);
    if new_price is null or new_price < 0 or new_price > 1000000 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
    -- BR-L3: the price people paid (or are paying) is never changed under them.
    if new_price <> c.price and (c.price_locked_at is not null or exists (
         select 1 from public.enrollments e where e.course_id = p_course
           and e.status in ('pending_payment', 'pending_provider', 'confirmed', 'in_progress', 'completed'))) then
      raise exception 'price_locked' using errcode = 'P0001';
    end if;
  end if;
  if p_patch ? 'title' and char_length(trim(p_patch ->> 'title')) not between 3 and 200 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_patch ? 'duration_hours' and ((p_patch ->> 'duration_hours')::numeric < 0 or (p_patch ->> 'duration_hours')::numeric > 1000) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if c.mode = 'recorded' and (p_patch ? 'capacity' or p_patch ? 'min_capacity') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_patch ? 'capacity' and ((p_patch ->> 'capacity')::int < 1 or (p_patch ->> 'capacity')::int > 10000) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_patch ? 'min_capacity' and p_patch ->> 'min_capacity' is not null
     and ((p_patch ->> 'min_capacity')::int < 0
          or (p_patch ->> 'min_capacity')::int > coalesce((p_patch ->> 'capacity')::int, c.capacity, 10000)) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  update public.courses set
    title = case when p_patch ? 'title' then trim(p_patch ->> 'title') else title end,
    city = case when p_patch ? 'city' then nullif(trim(p_patch ->> 'city'), '') else city end,
    venue = case when p_patch ? 'venue' then nullif(trim(p_patch ->> 'venue'), '') else venue end,
    duration_hours = case when p_patch ? 'duration_hours' then (p_patch ->> 'duration_hours')::numeric else duration_hours end,
    capacity = case when p_patch ? 'capacity' then (p_patch ->> 'capacity')::int else capacity end,
    min_capacity = case when p_patch ? 'min_capacity' then (p_patch ->> 'min_capacity')::int else min_capacity end,
    price = case when p_patch ? 'price' then new_price else price end,
    pricing_set_at = case when (p_patch ->> 'pricing_set')::boolean is true then coalesce(pricing_set_at, now()) else pricing_set_at end,
    meeting_platform = case when p_patch ? 'meeting_platform' then p_patch ->> 'meeting_platform' else meeting_platform end,
    record_sessions = coalesce((p_patch ->> 'record_sessions')::boolean, record_sessions),
    live_questions = coalesce((p_patch ->> 'live_questions')::boolean, live_questions),
    auto_attendance = coalesce((p_patch ->> 'auto_attendance')::boolean, auto_attendance),
    waitlist_enabled = coalesce((p_patch ->> 'waitlist_enabled')::boolean, waitlist_enabled),
    lifetime_access = coalesce((p_patch ->> 'lifetime_access')::boolean, lifetime_access),
    allow_downloads = coalesce((p_patch ->> 'allow_downloads')::boolean, allow_downloads),
    certificate_on_completion = coalesce((p_patch ->> 'certificate_on_completion')::boolean, certificate_on_completion)
  where id = p_course;

  if p_patch ? 'meeting_url' then
    insert into public.course_private (course_id, meeting_url, updated_at)
    values (p_course, nullif(trim(p_patch ->> 'meeting_url'), ''), now())
    on conflict (course_id) do update set meeting_url = excluded.meeting_url, updated_at = now();
    -- Sessions carry the link that join_live_session hands to enrolled trainees.
    update public.course_sessions set meeting_url = nullif(trim(p_patch ->> 'meeting_url'), '')
    where course_id = p_course and status in ('scheduled', 'live');
  end if;
end $$;

-- Step ٣ (حضوري / مباشر): the generated schedule replaces the draft's sessions.
-- p_sessions: [{ "title", "starts_at", "ends_at", "module_id"?, "location"? }]
create or replace function public.save_course_sessions(p_course uuid, p_sessions jsonb)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  c public.courses;
  s jsonb;
  i int := 0;
  url text;
begin
  select * into c from public.courses where id = p_course for update;
  if not found or not public.manages_course(p_course) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if c.status <> 'draft' then raise exception 'field_locked' using errcode = 'P0001'; end if;
  if c.mode = 'recorded' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_sessions) <> 'array' or jsonb_array_length(p_sessions) > 200 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  select meeting_url into url from public.course_private where course_id = p_course;
  delete from public.course_sessions where course_id = p_course;
  for s in select * from jsonb_array_elements(p_sessions) order by (value ->> 'starts_at')::timestamptz loop
    if (s ->> 'ends_at')::timestamptz <= (s ->> 'starts_at')::timestamptz then
      raise exception 'invalid_input' using errcode = 'P0001';
    end if;
    if s ->> 'module_id' is not null and not exists (
      select 1 from public.course_modules m where m.id = (s ->> 'module_id')::uuid and m.course_id = p_course) then
      raise exception 'invalid_input' using errcode = 'P0001';
    end if;
    i := i + 1;
    insert into public.course_sessions (course_id, position, title, starts_at, ends_at, location, meeting_url, module_id)
    values (p_course, i, left(coalesce(nullif(trim(s ->> 'title'), ''), 'الجلسة ' || i), 200),
            (s ->> 'starts_at')::timestamptz, (s ->> 'ends_at')::timestamptz,
            coalesce(nullif(trim(s ->> 'location'), ''), case when c.mode = 'in_person' then nullif(concat_ws(' · ', c.venue, c.city), '') end),
            case when c.mode = 'live_remote' then url end,
            (s ->> 'module_id')::uuid);
  end loop;
  update public.courses set
    starts_at = (select min(starts_at) from public.course_sessions where course_id = p_course),
    ends_at = (select max(ends_at) from public.course_sessions where course_id = p_course)
  where id = p_course;
  return i;
end $$;

-- TRR-CRS-05 ٢ «عدّل جلسة قادمة»: title/axis/room/time of a session that has not started. Registered
-- trainees are notified of any change (BR-U2). Past sessions stay as they happened.
create or replace function public.update_course_session(p_session uuid, p_title text, p_starts_at timestamptz,
                                                        p_ends_at timestamptz, p_location text, p_module uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  s public.course_sessions;
  c public.courses;
  moved boolean;
  r record;
begin
  select * into s from public.course_sessions where id = p_session for update;
  if not found or not public.manages_course(s.course_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into c from public.courses where id = s.course_id;
  if s.status <> 'scheduled' or s.starts_at <= now() then raise exception 'session_locked' using errcode = 'P0001'; end if;
  if p_ends_at <= p_starts_at or p_starts_at <= now() or char_length(trim(coalesce(p_title, ''))) < 2 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_module is not null and not exists (select 1 from public.course_modules m where m.id = p_module and m.course_id = s.course_id) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  moved := p_starts_at <> s.starts_at or p_ends_at <> s.ends_at or coalesce(p_location, '') <> coalesce(s.location, '');
  update public.course_sessions set title = left(trim(p_title), 200), starts_at = p_starts_at, ends_at = p_ends_at,
    location = nullif(trim(coalesce(p_location, '')), ''), module_id = p_module
  where id = p_session;
  update public.courses set
    starts_at = (select min(x.starts_at) from public.course_sessions x where x.course_id = c.id and x.status <> 'cancelled'),
    ends_at = (select max(x.ends_at) from public.course_sessions x where x.course_id = c.id and x.status <> 'cancelled')
  where id = c.id;
  if moved and c.status <> 'draft' then
    for r in select e.trainee_id from public.enrollments e
             where e.course_id = c.id and e.status in ('confirmed', 'in_progress', 'pending_provider') loop
      perform public.notify(r.trainee_id, 'session_changed', 'تغيّر موعد أو مكان جلسة',
        c.title || ' · ' || left(trim(p_title), 120), '/trainee/trainings');
    end loop;
  end if;
end $$;

-- TRR-CRS-02 ٥: publish once nothing blocks it and the trainer confirmed the content is theirs.
create or replace function public.publish_course(p_course uuid, p_ack boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); c public.courses;
begin
  select * into c from public.courses where id = p_course for update;
  if not found or not public.manages_course(p_course) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if c.status <> 'draft' then raise exception 'already_published' using errcode = 'P0001'; end if;
  if p_ack is not true then raise exception 'ack_required' using errcode = 'P0001'; end if;
  if exists (select 1 from public.course_publish_blockers(p_course)) then
    raise exception 'publish_incomplete' using errcode = 'P0001';
  end if;
  -- Lessons written while drafting go live with the course.
  perform set_config('app.trusted_op', 'on', true);
  update public.lessons set published_at = now() where course_id = p_course;
  update public.courses set status = 'open', published_at = now() where id = p_course;
end $$;

-- «أوقف البيع مؤقتًا» / resume: current purchasers keep their access.
create or replace function public.set_course_sales_paused(p_course uuid, p_paused boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); c public.courses;
begin
  select * into c from public.courses where id = p_course for update;
  if not found or not public.manages_course(p_course) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if c.status in ('draft', 'completed', 'cancelled') then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  update public.courses set sales_paused_at = case when p_paused then coalesce(sales_paused_at, now()) end where id = p_course;
end $$;

-- TRR-CRS-08 (BR-L10): release draft lessons of a published course. Progress is recomputed from the new total
-- (course_progress counts published lessons), issued certificates stay, and every purchaser is told.
create or replace function public.publish_new_content(p_course uuid, p_lessons uuid[], p_ack boolean)
returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); c public.courses; n int; r record;
begin
  select * into c from public.courses where id = p_course for update;
  if not found or not public.manages_course(p_course) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if c.status = 'draft' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if p_ack is not true then raise exception 'ack_required' using errcode = 'P0001'; end if;
  if exists (
    select 1 from public.lessons l where l.course_id = p_course and l.id = any(p_lessons) and l.published_at is null and not (
      (l.kind in ('video', 'file') and l.media_path is not null)
      or (l.kind = 'text' and coalesce(char_length(trim(l.body)), 0) > 0)
      or (l.kind = 'quiz' and exists (select 1 from public.quizzes q where q.lesson_id = l.id and jsonb_array_length(q.questions) > 0)))) then
    raise exception 'lessons_without_material' using errcode = 'P0001';
  end if;
  perform set_config('app.trusted_op', 'on', true);
  update public.lessons set published_at = now()
  where course_id = p_course and id = any(p_lessons) and published_at is null;
  get diagnostics n = row_count;
  if n > 0 then
    for r in select e.id, e.trainee_id from public.enrollments e
             where e.course_id = p_course and e.status in ('confirmed', 'in_progress', 'completed') loop
      perform public.notify(r.trainee_id, 'new_content', 'أضاف المدرب محتوى جديدًا',
        c.title || ' · ' || n || ' ' || case when n = 1 then 'درس جديد' when n = 2 then 'درسان جديدان' else 'دروس جديدة' end,
        '/trainee/learn/' || r.id);
    end loop;
  end if;
  return n;
end $$;

-- «أرسل تنبيهًا للمسجّلين» (TRR-CRS-05 ١ إجراءات الدورة).
create or replace function public.notify_course_trainees(p_course uuid, p_title text, p_body text)
returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); c public.courses; n int := 0; r record;
begin
  select * into c from public.courses where id = p_course;
  if not found or not public.manages_course(p_course) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if char_length(trim(coalesce(p_title, ''))) not between 3 and 120 or char_length(coalesce(p_body, '')) > 1000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  for r in select e.trainee_id from public.enrollments e
           where e.course_id = p_course and e.status in ('pending_provider', 'confirmed', 'in_progress') loop
    perform public.notify(r.trainee_id, 'course_announcement', trim(p_title),
      c.title || coalesce(' · ' || nullif(trim(p_body), ''), ''), '/trainee/trainings');
    n := n + 1;
  end loop;
  return n;
end $$;

-- Sale page views (TRR-CRS-07 «مشاهدة الصفحة»): counted for published courses, never for their own staff.
create or replace function public.record_course_view(p_course uuid)
returns void
language sql security definer set search_path = '' as $$
  update public.courses set page_views = page_views + 1
  where id = p_course and status <> 'draft' and not public.manages_course(p_course);
$$;

-- TRR-CRS-09 / TRR-CRS-07: the course's transactions for its staff. Payment rows are not readable by trainers
-- (payments_read), so this returns only what the sales screens show: no card data, no other courses.
create or replace function public.course_sales(p_course uuid)
returns table (
  enrollment_id uuid, trainee_id uuid, trainee_name text, avatar_path text, enrollment_status public.enrollment_status,
  created_at timestamptz, confirmed_at timestamptz, list_price numeric, price_paid numeric, vat_amount numeric,
  currency text, discount_code text, discount_amount numeric, payment_id uuid, payment_status public.payment_status,
  payment_method text, payment_ref text, paid_at timestamptz, receipt_number text,
  refund_amount numeric, refund_status public.request_status, refund_reason text, refund_decided_at timestamptz,
  commission_percent numeric)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.require_user();
  if not (public.manages_course(p_course) or public.is_admin()) then raise exception 'not_found' using errcode = 'P0001'; end if;
  return query
    select e.id, e.trainee_id, coalesce(nullif(pr.full_name, ''), 'متدرب'), pr.avatar_path, e.status, e.created_at, e.confirmed_at,
           e.list_price, e.price_paid, e.vat_amount, e.currency, d.code, greatest(e.list_price - e.price_paid, 0),
           pay.id, pay.status, pay.method, pay.provider_ref, pay.updated_at, rc.number,
           rf.amount, rf.status, rf.reason, rf.decided_at,
           public.platform_commission_percent()
    from public.enrollments e
    join public.profiles pr on pr.id = e.trainee_id
    left join public.discount_codes d on d.id = e.discount_code_id
    left join lateral (
      select x.* from public.payments x where x.enrollment_id = e.id and x.status in ('succeeded', 'refunded')
      order by x.created_at desc limit 1) pay on true
    left join public.receipts rc on rc.payment_id = pay.id
    left join lateral (
      select y.* from public.refund_requests y where y.enrollment_id = e.id and y.cancelled_at is null
      order by y.created_at desc limit 1) rf on true
    where e.course_id = p_course
      and (pay.id is not null or (e.price_paid = 0 and e.status in ('confirmed', 'in_progress', 'completed', 'withdrawn')))
    order by coalesce(pay.updated_at, e.confirmed_at, e.created_at) desc;
end $$;

-- ── Storage: lesson media and course files (bucket lesson-media, "<course_id>/…") ──────────────────
update storage.buckets
set allowed_mime_types = array['video/mp4', 'video/webm', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'image/jpeg', 'image/png']
where id = 'lesson-media';

create policy "lesson media update" on storage.objects for update to authenticated
  using (bucket_id = 'lesson-media' and public.manages_course(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'lesson-media' and public.manages_course(((storage.foldername(name))[1])::uuid));
create policy "lesson media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-media' and public.manages_course(((storage.foldername(name))[1])::uuid));

-- ── Privileges ─────────────────────────────────────────────────────────────────────────────────────
revoke execute on function public.platform_commission_percent() from public, anon;
revoke execute on function public.guard_course_module() from public, anon, authenticated;
revoke execute on function public.guard_lesson() from public, anon, authenticated;
revoke execute on function public.guard_lesson_delete() from public, anon, authenticated;
revoke execute on function public.guard_quiz() from public, anon, authenticated;
revoke execute on function public.guard_assignment() from public, anon, authenticated;
revoke execute on function public.guard_course_publish() from public, anon, authenticated;
revoke execute on function public.guard_enrollment_sales() from public, anon, authenticated;
revoke execute on function public.guard_waitlist_enabled() from public, anon, authenticated;
revoke execute on function public.course_publish_blockers(uuid) from public, anon;
revoke execute on function public.create_course(uuid, public.course_mode, text) from public, anon;
revoke execute on function public.update_course_setup(uuid, jsonb) from public, anon;
revoke execute on function public.save_course_sessions(uuid, jsonb) from public, anon;
revoke execute on function public.update_course_session(uuid, text, timestamptz, timestamptz, text, uuid) from public, anon;
revoke execute on function public.publish_course(uuid, boolean) from public, anon;
revoke execute on function public.set_course_sales_paused(uuid, boolean) from public, anon;
revoke execute on function public.publish_new_content(uuid, uuid[], boolean) from public, anon;
revoke execute on function public.notify_course_trainees(uuid, text, text) from public, anon;
revoke execute on function public.course_sales(uuid) from public, anon;
revoke execute on function public.record_course_view(uuid) from public;

grant execute on function
  public.platform_commission_percent(),
  public.course_publish_blockers(uuid),
  public.create_course(uuid, public.course_mode, text),
  public.update_course_setup(uuid, jsonb),
  public.save_course_sessions(uuid, jsonb),
  public.update_course_session(uuid, text, timestamptz, timestamptz, text, uuid),
  public.publish_course(uuid, boolean),
  public.set_course_sales_paused(uuid, boolean),
  public.publish_new_content(uuid, uuid[], boolean),
  public.notify_course_trainees(uuid, text, text),
  public.course_sales(uuid)
to authenticated;
grant execute on function public.record_course_view(uuid) to anon, authenticated;
