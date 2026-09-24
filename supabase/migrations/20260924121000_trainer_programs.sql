-- Trainer workspace · programs (TRR-PRG-01…09, TRR-DEC-01).
-- A program is authored as a draft (programs row + program_units/program_items), declared and submitted for
-- platform review, and approved by an admin (review_program). Approval freezes the declared content into an
-- immutable program_versions snapshot (BR-L1) and publishes the program. Published programs are never edited
-- in place: «نسخة جديدة» (clone_program) copies them into a new, independent draft program.

-- ── Programs: authoring fields + review workflow ─────────────────────────────
create type public.program_review_state as enum ('draft', 'under_review', 'needs_changes', 'rejected', 'approved');

alter table public.programs
  add column review_state public.program_review_state not null default 'draft',
  add column cover_path text,
  add column skills text[] not null default '{}',
  add column audience text[] not null default '{}',
  add column objectives text[] not null default '{}',
  add column prerequisites text,
  add column total_hours numeric(6, 1) check (total_hours is null or (total_hours > 0 and total_hours <= 2000)),
  add column language text not null default 'ar' check (language in ('ar', 'en', 'ar_en')),
  add column reference_price numeric(10, 2) check (reference_price is null or reference_price >= 0),
  add column revision int not null default 0 check (revision >= 0),
  add column derived_from uuid references public.programs (id) on delete set null,
  add column submitted_at timestamptz,
  add column decided_at timestamptz,
  add column published_at timestamptz;

create index programs_derived_from_idx on public.programs (derived_from);
create index programs_owner_updated_idx on public.programs (owner_id, updated_at desc);

-- Existing published programs (seed catalog) were approved when they were created; their authoring fields
-- mirror the frozen snapshot so the trainer workspace shows the same content trainees see.
update public.programs p set
  review_state = 'approved',
  revision = greatest(p.revision, 1),
  published_at = coalesce(p.published_at, p.created_at),
  decided_at = coalesce(p.decided_at, p.created_at),
  objectives = coalesce(array(select jsonb_array_elements_text(v.snapshot -> 'objectives')), '{}'),
  audience = coalesce(array(select jsonb_array_elements_text(v.snapshot -> 'audience')), '{}'),
  skills = coalesce(array(select jsonb_array_elements_text(v.snapshot -> 'skills')), '{}'),
  prerequisites = nullif(array_to_string(array(select jsonb_array_elements_text(v.snapshot -> 'requirements')), E'\n'), '')
from public.program_versions v
where v.program_id = p.id and v.version = p.current_version and p.status = 'published'
  and jsonb_typeof(coalesce(v.snapshot -> 'objectives', '[]'::jsonb)) = 'array'
  and jsonb_typeof(coalesce(v.snapshot -> 'audience', '[]'::jsonb)) = 'array'
  and jsonb_typeof(coalesce(v.snapshot -> 'skills', '[]'::jsonb)) = 'array'
  and jsonb_typeof(coalesce(v.snapshot -> 'requirements', '[]'::jsonb)) = 'array';
update public.programs set review_state = 'approved', published_at = coalesce(published_at, created_at)
where status = 'published' and review_state = 'draft';

-- ── Curriculum: محاور/فصول → دروس/واجبات (+ materials) ────────────────────────
create table public.program_units (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  kind text not null default 'module' check (kind in ('module', 'chapter')),
  position int not null default 0,
  title text not null check (char_length(trim(title)) between 2 and 160),
  summary text check (summary is null or char_length(summary) <= 600),
  created_at timestamptz not null default now(),
  unique (id, program_id)
);
create index program_units_program_idx on public.program_units (program_id, position);

create table public.program_items (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  unit_id uuid not null,
  kind text not null check (kind in ('video', 'file', 'text', 'quiz', 'assignment')),
  position int not null default 0,
  title text not null check (char_length(trim(title)) between 2 and 160),
  summary text check (summary is null or char_length(summary) <= 600),
  duration_minutes int check (duration_minutes is null or duration_minutes between 1 and 1440),
  max_score int check (max_score is null or max_score between 1 and 1000),
  weight_percent int check (weight_percent is null or weight_percent between 1 and 100),
  due_note text check (due_note is null or char_length(due_note) <= 160),
  media_path text,
  media_name text,
  media_type text,
  media_size bigint check (media_size is null or media_size >= 0),
  created_at timestamptz not null default now(),
  foreign key (unit_id, program_id) references public.program_units (id, program_id) on delete cascade
);
create index program_items_program_idx on public.program_items (program_id);
create index program_items_unit_idx on public.program_items (unit_id, program_id, position);

-- ── Declarations (TRR-DEC-01) and review requests (TRR-PRG-05) ──────────────
create sequence public.program_declaration_seq start 10001;

create table public.program_declarations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  program_id uuid not null references public.programs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  revision int not null,
  clauses text[] not null,
  content_hash text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index program_declarations_program_idx on public.program_declarations (program_id, created_at desc);
create index program_declarations_user_idx on public.program_declarations (user_id);
create trigger program_declarations_immutable before update on public.program_declarations
  for each row execute function public.forbid_update();

create table public.program_review_requests (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  declaration_id uuid not null references public.program_declarations (id) on delete restrict,
  revision int not null,
  status text not null default 'under_review'
    check (status in ('under_review', 'approved', 'needs_changes', 'rejected', 'withdrawn')),
  submitted_by uuid not null references public.profiles (id) on delete restrict,
  submitted_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  reason text,
  note text,
  findings jsonb not null default '[]'::jsonb check (jsonb_typeof(findings) = 'array'),
  version_id uuid references public.program_versions (id) on delete restrict
);
create index program_review_requests_program_idx on public.program_review_requests (program_id, submitted_at desc);
create index program_review_requests_declaration_idx on public.program_review_requests (declaration_id);
create index program_review_requests_submitted_by_idx on public.program_review_requests (submitted_by);
create index program_review_requests_decided_by_idx on public.program_review_requests (decided_by);
create index program_review_requests_version_idx on public.program_review_requests (version_id);
create index program_review_requests_open_idx on public.program_review_requests (submitted_at) where status = 'under_review';
create unique index program_review_requests_one_open on public.program_review_requests (program_id) where status = 'under_review';

-- ── Helpers ──────────────────────────────────────────────────────────────────
-- Owner can edit only while the program is an unpublished draft that is not under review.
create or replace function public.can_edit_program(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.programs g
    where g.id = p and g.owner_id = auth.uid() and g.status = 'draft' and g.review_state in ('draft', 'needs_changes')
  );
$$;

create or replace function public.owns_program(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.programs g where g.id = p and g.owner_id = auth.uid());
$$;

-- Owners may change content fields of an editable draft; workflow columns only move through the RPCs below.
create or replace function public.guard_program_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(current_setting('app.trusted_op', true), '') = 'on' then
    return new;
  end if;
  if public.is_admin() and old.owner_id <> auth.uid() then
    return new;
  end if;
  if old.status <> 'draft' or old.review_state not in ('draft', 'needs_changes') then
    raise exception 'program_locked' using errcode = 'P0001';
  end if;
  new.owner_id := old.owner_id;
  new.organization_id := old.organization_id;
  new.slug := old.slug;
  new.status := old.status;
  new.review_state := old.review_state;
  new.current_version := old.current_version;
  new.revision := old.revision;
  new.derived_from := old.derived_from;
  new.submitted_at := old.submitted_at;
  new.decided_at := old.decided_at;
  new.published_at := old.published_at;
  return new;
end $$;
create trigger programs_guard before update on public.programs
  for each row execute function public.guard_program_update();

-- Missing mandatory fields before a program can be submitted (codes used by the UI and by the submit RPC).
create or replace function public.program_missing_fields(p uuid) returns text[]
language sql stable security invoker set search_path = '' as $$
  select array_remove(array[
    case when g.cover_path is null then 'cover' end,
    case when char_length(coalesce(trim(g.summary), '')) < 20 then 'summary' end,
    case when g.category_id is null then 'category' end,
    case when cardinality(g.objectives) = 0 then 'objectives' end,
    case when g.total_hours is null then 'hours' end,
    case when not exists (select 1 from public.program_units u where u.program_id = g.id) then 'units' end,
    case when g.reference_price is null then 'price' end
  ], null)
  from public.programs g where g.id = p;
$$;

-- Content snapshot (what the trainer declares and what an approved version freezes).
create or replace function public.program_snapshot(p uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'title', g.title,
    'summary', g.summary,
    'category_id', g.category_id,
    'level', g.level,
    'cover_path', g.cover_path,
    'skills', to_jsonb(g.skills),
    'audience', to_jsonb(g.audience),
    'objectives', to_jsonb(g.objectives),
    'requirements', to_jsonb(array_remove(regexp_split_to_array(coalesce(trim(g.prerequisites), ''), E'\\s*\\n\\s*'), '')),
    'total_hours', g.total_hours,
    'language', g.language,
    'reference_price', g.reference_price,
    'revision', g.revision,
    'units', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', u.title, 'kind', u.kind, 'summary', u.summary,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'title', i.title, 'kind', i.kind, 'summary', i.summary, 'duration_minutes', i.duration_minutes,
            'max_score', i.max_score, 'weight_percent', i.weight_percent, 'due_note', i.due_note,
            'media_path', i.media_path, 'media_name', i.media_name, 'media_size', i.media_size
          ) order by i.position, i.created_at)
          from public.program_items i where i.unit_id = u.id), '[]'::jsonb)
      ) order by u.position, u.created_at)
      from public.program_units u where u.program_id = g.id), '[]'::jsonb)
  )
  from public.programs g where g.id = p;
$$;

-- ── Trainer RPCs ─────────────────────────────────────────────────────────────
create or replace function public.create_program(p_title text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  t text := trim(coalesce(p_title, ''));
  pid uuid;
begin
  if not public.has_workspace('trainer') then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if char_length(t) < 3 or char_length(t) > 200 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  insert into public.programs (slug, title, owner_id, status, review_state)
  values ('prg-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 14), t, u, 'draft', 'draft')
  returning id into pid;
  return pid;
end $$;

create or replace function public.reorder_program_units(p_program uuid, p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user();
begin
  if not public.can_edit_program(p_program) then raise exception 'program_locked' using errcode = 'P0001'; end if;
  update public.program_units pu set position = o.n
  from unnest(p_ids) with ordinality as o(id, n)
  where pu.id = o.id and pu.program_id = p_program;
end $$;

-- TRR-DEC-01: declaration + submission for review (locks the program until a decision or withdrawal).
create or replace function public.submit_program_for_review(p_program uuid, p_clauses text[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  g public.programs;
  missing text[];
  snap jsonb;
  dec_id uuid;
  req_id uuid;
  rev int;
begin
  select * into g from public.programs where id = p_program for update;
  if not found or g.owner_id <> u then raise exception 'not_found' using errcode = 'P0001'; end if;
  if g.status <> 'draft' or g.review_state not in ('draft', 'needs_changes') then
    raise exception 'program_locked' using errcode = 'P0001';
  end if;
  if not (coalesce(p_clauses, '{}') @> array['content_ownership', 'accuracy', 'credentials', 'delivery', 'final']) then
    raise exception 'declaration_required' using errcode = 'P0001';
  end if;
  missing := public.program_missing_fields(p_program);
  if cardinality(missing) > 0 then raise exception 'program_incomplete' using errcode = 'P0001'; end if;

  rev := g.revision + 1;
  perform set_config('app.trusted_op', 'on', true);
  update public.programs set revision = rev, review_state = 'under_review', submitted_at = now(), decided_at = null
  where id = p_program;
  snap := public.program_snapshot(p_program);

  insert into public.program_declarations (reference, program_id, user_id, revision, clauses, content_hash, snapshot)
  values ('ID-' || to_char(now() at time zone 'Asia/Riyadh', 'YYYY') || '-' || nextval('public.program_declaration_seq'),
          p_program, u, rev, p_clauses,
          upper(encode(extensions.digest(convert_to(snap::text, 'UTF8'), 'sha256'), 'hex')), snap)
  returning id into dec_id;

  insert into public.program_review_requests (program_id, declaration_id, revision, submitted_by)
  values (p_program, dec_id, rev, u)
  returning id into req_id;
  return req_id;
end $$;

-- TRR-PRG-08: withdraw a pending request (fails once a decision exists).
create or replace function public.withdraw_program_review(p_program uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  g public.programs;
begin
  select * into g from public.programs where id = p_program for update;
  if not found or g.owner_id <> u then raise exception 'not_found' using errcode = 'P0001'; end if;
  if g.review_state <> 'under_review' then raise exception 'review_already_decided' using errcode = 'P0001'; end if;
  update public.program_review_requests set status = 'withdrawn', decided_at = now()
  where program_id = p_program and status = 'under_review';
  perform set_config('app.trusted_op', 'on', true);
  update public.programs set review_state = 'draft', submitted_at = null where id = p_program;
end $$;

-- TRR-PRG-09: a new, independent draft program copied from one of the trainer's programs.
create or replace function public.clone_program(
  p_source uuid, p_title text, p_objectives boolean, p_units boolean, p_assignments boolean, p_materials boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  g public.programs;
  t text := trim(coalesce(p_title, ''));
  pid uuid;
  src record;
  new_unit uuid;
begin
  select * into g from public.programs where id = p_source;
  if not found or g.owner_id <> u then raise exception 'not_found' using errcode = 'P0001'; end if;
  if char_length(t) < 3 or char_length(t) > 200 then raise exception 'invalid_input' using errcode = 'P0001'; end if;

  insert into public.programs (slug, title, summary, category_id, level, owner_id, status, review_state, cover_path, skills,
                               audience, objectives, prerequisites, total_hours, language, reference_price, derived_from)
  values ('prg-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 14), t, g.summary, g.category_id, g.level, u,
          'draft', 'draft', g.cover_path, g.skills, g.audience,
          case when p_objectives then g.objectives else '{}' end,
          g.prerequisites, g.total_hours, g.language, g.reference_price, g.id)
  returning id into pid;

  if p_units or p_assignments then
    for src in select * from public.program_units where program_id = p_source order by position, created_at loop
      insert into public.program_units (program_id, kind, position, title, summary)
      values (pid, src.kind, src.position, src.title, src.summary) returning id into new_unit;
      insert into public.program_items (program_id, unit_id, kind, position, title, summary, duration_minutes, max_score,
                                        weight_percent, due_note, media_path, media_name, media_type, media_size)
      select pid, new_unit, i.kind, i.position, i.title, i.summary, i.duration_minutes, i.max_score, i.weight_percent, i.due_note,
             case when p_materials then i.media_path end, case when p_materials then i.media_name end,
             case when p_materials then i.media_type end, case when p_materials then i.media_size end
      from public.program_items i
      where i.unit_id = src.id
        and ((i.kind = 'assignment' and p_assignments) or (i.kind <> 'assignment' and p_units));
    end loop;
  end if;
  return pid;
end $$;

-- ── Admin RPC (no admin workspace yet): approve / request changes / reject ──
create or replace function public.review_program(
  p_program uuid, p_decision text, p_reason text default null, p_note text default null, p_findings jsonb default '[]'::jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  g public.programs;
  r public.program_review_requests;
  snap jsonb;
  v int;
  vid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if p_decision not in ('approved', 'needs_changes', 'rejected') then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if jsonb_typeof(coalesce(p_findings, '[]'::jsonb)) <> 'array' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if p_decision = 'needs_changes' and jsonb_array_length(coalesce(p_findings, '[]'::jsonb)) = 0 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_decision = 'rejected' and coalesce(trim(p_reason), '') = '' then raise exception 'invalid_input' using errcode = 'P0001'; end if;

  select * into g from public.programs where id = p_program for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into r from public.program_review_requests where program_id = p_program and status = 'under_review' for update;
  if not found then raise exception 'invalid_state' using errcode = 'P0001'; end if;

  perform set_config('app.trusted_op', 'on', true);
  if p_decision = 'approved' then
    select d.snapshot into snap from public.program_declarations d where d.id = r.declaration_id;
    select coalesce(max(version), 0) + 1 into v from public.program_versions where program_id = p_program;
    insert into public.program_versions (program_id, version, snapshot) values (p_program, v, snap) returning id into vid;
    update public.programs set status = 'published', review_state = 'approved', current_version = v,
      decided_at = now(), published_at = now()
    where id = p_program;
  else
    update public.programs set review_state = p_decision::public.program_review_state, decided_at = now()
    where id = p_program;
  end if;

  update public.program_review_requests set status = p_decision, decided_by = u, decided_at = now(),
    reason = nullif(trim(p_reason), ''), note = nullif(trim(p_note), ''), findings = coalesce(p_findings, '[]'::jsonb),
    version_id = vid
  where id = r.id;

  perform public.notify(g.owner_id,
    'program_' || p_decision,
    case p_decision when 'approved' then 'اعتُمد برنامجك' when 'needs_changes' then 'برنامجك يحتاج تعديلًا' else 'تعذّر اعتماد برنامجك' end,
    g.title,
    '/trainer/programs/' || p_program || '/review');
end $$;

-- Platform commission shown on the pricing step (operational value from app_settings).
insert into public.app_settings (key, value) values ('platform_commission_percent', '10'::jsonb)
on conflict (key) do nothing;

create or replace function public.platform_commission_percent() returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'platform_commission_percent'), 10);
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.program_units enable row level security;
alter table public.program_items enable row level security;
alter table public.program_declarations enable row level security;
alter table public.program_review_requests enable row level security;

create policy programs_update_own on public.programs for update to authenticated
  using (owner_id = (select auth.uid()) and status = 'draft' and review_state in ('draft', 'needs_changes'))
  with check (owner_id = (select auth.uid()));

create policy program_units_read on public.program_units for select to authenticated
  using (public.owns_program(program_id) or public.is_admin());
create policy program_units_insert on public.program_units for insert to authenticated
  with check (public.can_edit_program(program_id));
create policy program_units_update on public.program_units for update to authenticated
  using (public.can_edit_program(program_id)) with check (public.can_edit_program(program_id));
create policy program_units_delete on public.program_units for delete to authenticated
  using (public.can_edit_program(program_id));

create policy program_items_read on public.program_items for select to authenticated
  using (public.owns_program(program_id) or public.is_admin());
create policy program_items_insert on public.program_items for insert to authenticated
  with check (public.can_edit_program(program_id));
create policy program_items_update on public.program_items for update to authenticated
  using (public.can_edit_program(program_id)) with check (public.can_edit_program(program_id));
create policy program_items_delete on public.program_items for delete to authenticated
  using (public.can_edit_program(program_id));

create policy program_declarations_read on public.program_declarations for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy program_review_requests_read on public.program_review_requests for select to authenticated
  using (public.owns_program(program_id) or public.is_admin());

-- ── Storage: program covers (public course-covers bucket) and private program materials ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('program-materials', 'program-materials', false, 524288000,
   array['video/mp4', 'application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "program covers insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'course-covers' and (storage.foldername(name))[1] = (select auth.uid())::text
              and (storage.foldername(name))[2] = 'programs');
create policy "program covers update" on storage.objects for update to authenticated
  using (bucket_id = 'course-covers' and (storage.foldername(name))[1] = (select auth.uid())::text
         and (storage.foldername(name))[2] = 'programs')
  with check (bucket_id = 'course-covers' and (storage.foldername(name))[1] = (select auth.uid())::text
              and (storage.foldername(name))[2] = 'programs');
create policy "program materials insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'program-materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "program materials read" on storage.objects for select to authenticated
  using (bucket_id = 'program-materials' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

-- ── Function privileges ─────────────────────────────────────────────────────
revoke execute on function
  public.can_edit_program(uuid), public.owns_program(uuid), public.guard_program_update(),
  public.program_missing_fields(uuid), public.program_snapshot(uuid), public.create_program(text),
  public.reorder_program_units(uuid, uuid[]), public.submit_program_for_review(uuid, text[]),
  public.withdraw_program_review(uuid), public.clone_program(uuid, text, boolean, boolean, boolean, boolean),
  public.review_program(uuid, text, text, text, jsonb), public.platform_commission_percent()
from public, anon, authenticated;

grant execute on function
  public.can_edit_program(uuid), public.owns_program(uuid), public.program_missing_fields(uuid),
  public.create_program(text), public.reorder_program_units(uuid, uuid[]), public.submit_program_for_review(uuid, text[]),
  public.withdraw_program_review(uuid), public.clone_program(uuid, text, boolean, boolean, boolean, boolean),
  public.review_program(uuid, text, text, text, jsonb), public.platform_commission_percent()
to authenticated;
-- program_snapshot and guard_program_update are internal (called from the RPCs / trigger only).
