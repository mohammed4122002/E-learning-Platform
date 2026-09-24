-- TRR-CRS-02: a new course inherits the axes and assignment definitions of the program version it runs
-- (program snapshot "units" → course_modules locked as from_program; "assignment" items → assignments).
-- Replaces create_course() from 20260924122000 with the same signature; older snapshot shapes still work.

create or replace function public.create_course(p_program_version uuid, p_mode public.course_mode, p_title text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  v public.program_versions;
  p public.programs;
  cid uuid;
  units jsonb;
  unit jsonb;
  item jsonb;
  mid uuid;
  i int := 0;
  t text;
  has_modules boolean;
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
                              capacity, currency, status, meeting_platform, duration_hours)
  values (
    left(p.slug, 120) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    p.id, v.id, u, p.organization_id, left(t, 200),
    coalesce(v.snapshot ->> 'summary', p.summary), p_mode, p.level,
    case when p_mode = 'recorded' then null else 20 end, 'SAR', 'draft',
    case when p_mode = 'live_remote' then 'zoom' end,
    nullif(v.snapshot ->> 'total_hours', '')::numeric)
  returning id into cid;
  insert into public.course_private (course_id) values (cid);

  units := case when jsonb_typeof(v.snapshot -> 'units') = 'array' then v.snapshot -> 'units'
                when jsonb_typeof(v.snapshot -> 'modules') = 'array' then v.snapshot -> 'modules'
                when jsonb_typeof(v.snapshot -> 'axes') = 'array' then v.snapshot -> 'axes'
                else '[]'::jsonb end;
  -- Axes are the "module" units; chapter units only group materials unless the program has no axes.
  has_modules := exists (select 1 from jsonb_array_elements(units) x where x.value ->> 'kind' = 'module');

  for unit in select value from jsonb_array_elements(units) loop
    mid := null;
    t := case when jsonb_typeof(unit) = 'string' then unit #>> '{}' else unit ->> 'title' end;
    if coalesce(char_length(trim(t)), 0) >= 2 and (not has_modules or unit ->> 'kind' = 'module') then
      i := i + 1;
      insert into public.course_modules (course_id, position, title, from_program)
      values (cid, i, left(trim(t), 200), true) returning id into mid;
    end if;
    if jsonb_typeof(unit -> 'items') = 'array' then
      for item in select value from jsonb_array_elements(unit -> 'items') loop
        if item ->> 'kind' = 'assignment' and coalesce(char_length(trim(item ->> 'title')), 0) >= 2 then
          insert into public.assignments (course_id, module_id, title, instructions, max_score, weight_percent)
          values (cid, mid, left(trim(item ->> 'title'), 200), nullif(trim(coalesce(item ->> 'summary', '')), ''),
                  coalesce(nullif(item ->> 'max_score', '')::int, 100), nullif(item ->> 'weight_percent', '')::int);
        end if;
      end loop;
    end if;
  end loop;
  return cid;
end $$;

revoke execute on function public.create_course(uuid, public.course_mode, text) from public, anon;
grant execute on function public.create_course(uuid, public.course_mode, text) to authenticated;
