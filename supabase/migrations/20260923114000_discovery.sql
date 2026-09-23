-- Discovery & comparison read models (TRN-DSC-01 · TRN-DSC-02/03 · TRN-CMP-01).
-- All three are read-only, run as the signed-in user and only expose published catalog data.

-- Shared predicate: an ILIKE pattern with the user's wildcards escaped.
create or replace function public.discover_pattern(p_q text) returns text
language sql immutable set search_path = '' as $$
  select case when nullif(trim(p_q), '') is null then null
              else '%' || replace(replace(replace(trim(p_q), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
$$;

-- TRN-DSC-01 · results: one page of course ids in the requested order + the total match count.
-- Sorts: rating (الأعلى تقييمًا), newest (الأحدث), price_asc/price_desc (السعر), recommended
-- (trainee_preferences: followed categories, then level, then preferred modes).
create or replace function public.discover_courses(
  p_q text default null,
  p_categories uuid[] default null,
  p_modes public.course_mode[] default null,
  p_levels public.course_level[] default null,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_min_rating numeric default null,
  p_cities text[] default null,
  p_sort text default 'rating',
  p_limit int default 12,
  p_offset int default 0
) returns table (course_id uuid, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  pat text := public.discover_pattern(p_q);
  cats uuid[] := '{}';
  lvl public.course_level;
  mds public.course_mode[] := '{}';
begin
  if p_limit is null or p_limit < 1 or p_limit > 48 or p_offset is null or p_offset < 0
     or coalesce(p_sort, '') not in ('rating', 'newest', 'price_asc', 'price_desc', 'recommended') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  select tp.category_ids, tp.level, tp.modes into cats, lvl, mds from public.trainee_preferences tp where tp.user_id = u;

  return query
  with m as (
    select c.id, c.rating_avg, c.rating_count, c.learners_count, c.created_at, c.price,
           (case when p.category_id = any (coalesce(cats, '{}')) then 4 else 0 end
            + case when lvl is not null and c.level = lvl then 2 else 0 end
            + case when c.mode = any (coalesce(mds, '{}')) then 1 else 0 end) as score
    from public.courses c
    join public.programs p on p.id = c.program_id and p.status = 'published'
    where c.status = 'open'
      and (pat is null or c.title ilike pat or c.summary ilike pat or p.title ilike pat)
      and (p_categories is null or cardinality(p_categories) = 0 or p.category_id = any (p_categories))
      and (p_modes is null or cardinality(p_modes) = 0 or c.mode = any (p_modes))
      and (p_levels is null or cardinality(p_levels) = 0 or c.level = any (p_levels))
      and (p_price_min is null or c.price >= p_price_min)
      and (p_price_max is null or c.price <= p_price_max)
      and (p_min_rating is null or c.rating_avg >= p_min_rating)
      and (p_cities is null or cardinality(p_cities) = 0 or c.city = any (p_cities))
  )
  select m.id, count(*) over ()
  from m
  order by
    case when p_sort = 'recommended' then m.score end desc nulls last,
    case when p_sort = 'price_asc' then m.price end asc nulls last,
    case when p_sort = 'price_desc' then m.price end desc nulls last,
    case when p_sort = 'newest' then m.created_at end desc nulls last,
    m.rating_avg desc, m.rating_count desc, m.learners_count desc, m.created_at desc, m.id
  limit p_limit offset p_offset;
end $$;

-- TRN-DSC-01 · filter counts ("إدارة المشاريع · ٤٨"). Each facet ignores its own selection (standard faceting).
create or replace function public.discover_facets(
  p_q text default null,
  p_categories uuid[] default null,
  p_modes public.course_mode[] default null,
  p_levels public.course_level[] default null,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_min_rating numeric default null,
  p_cities text[] default null
) returns table (facet text, value text, hits bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  pat text := public.discover_pattern(p_q);
begin
  return query
  with b as (
    select c.mode, c.level, c.city, p.category_id,
           (p_categories is null or cardinality(p_categories) = 0 or p.category_id = any (p_categories)) as ok_cat,
           (p_modes is null or cardinality(p_modes) = 0 or c.mode = any (p_modes)) as ok_mode,
           (p_levels is null or cardinality(p_levels) = 0 or c.level = any (p_levels)) as ok_level,
           (p_cities is null or cardinality(p_cities) = 0 or c.city = any (p_cities)) as ok_city
    from public.courses c
    join public.programs p on p.id = c.program_id and p.status = 'published'
    where c.status = 'open'
      and (pat is null or c.title ilike pat or c.summary ilike pat or p.title ilike pat)
      and (p_price_min is null or c.price >= p_price_min)
      and (p_price_max is null or c.price <= p_price_max)
      and (p_min_rating is null or c.rating_avg >= p_min_rating)
  )
  select 'category'::text, b.category_id::text, count(*) from b
    where b.category_id is not null and b.ok_mode and b.ok_level and b.ok_city group by b.category_id
  union all
  select 'mode'::text, b.mode::text, count(*) from b where b.ok_cat and b.ok_level and b.ok_city group by b.mode
  union all
  select 'level'::text, b.level::text, count(*) from b where b.ok_cat and b.ok_mode and b.ok_city group by b.level
  union all
  select 'city'::text, b.city, count(*) from b
    where b.city is not null and b.ok_cat and b.ok_mode and b.ok_level group by b.city;
end $$;

-- Nav / Search Overlay (138:1867): typeahead groups برامج · مدربون · تخصصات; with an empty query it returns the
-- courses most enrolled in during the last 7 days ("trending").
create or replace function public.discover_suggest(p_q text default null)
returns table (kind text, id uuid, label text, slug text, hours numeric, rating numeric, hits bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  pat text := public.discover_pattern(p_q);
begin
  if char_length(coalesce(p_q, '')) > 120 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if pat is null then
    return query
    select 'trending'::text, c.id, c.title, c.slug, c.duration_hours, c.rating_avg,
           (select count(*) from public.enrollments e where e.course_id = c.id and e.created_at > now() - interval '7 days')
    from public.courses c
    join public.programs p on p.id = c.program_id and p.status = 'published'
    where c.status = 'open'
    order by 7 desc, c.learners_count desc, c.rating_avg desc, c.created_at desc
    limit 3;
    return;
  end if;

  return query
  (select 'program'::text, c.id, c.title, c.slug, c.duration_hours, c.rating_avg, null::bigint
   from public.courses c
   join public.programs p on p.id = c.program_id and p.status = 'published'
   where c.status = 'open' and (c.title ilike pat or p.title ilike pat)
   order by c.rating_avg desc, c.learners_count desc, c.title
   limit 4)
  union all
  (select 'trainer'::text, pr.id, pr.full_name, null::text, null::numeric, null::numeric, count(c.id)
   from public.profiles pr
   join public.courses c on c.trainer_id = pr.id and c.status = 'open'
   where pr.is_public and pr.full_name ilike pat
   group by pr.id, pr.full_name
   order by count(c.id) desc, pr.full_name
   limit 3)
  union all
  (select 'category'::text, k.id, k.name, k.slug, null::numeric, null::numeric,
          (select count(*) from public.courses c join public.programs p on p.id = c.program_id and p.status = 'published'
           where c.status = 'open' and p.category_id = k.id)
   from public.categories k
   where k.name ilike pat
   order by k.position
   limit 3);
end $$;

-- TRN-DSC-02/03 · TRN-CMP-01: public facts per course that RLS hides from non-enrolled trainees
-- (assignment/quiz counts), plus seats left and the syllabus size.
create or replace function public.course_public_facts(p_courses uuid[])
returns table (course_id uuid, seats_left int, modules int, lessons int, quizzes int, assignments int,
               sessions int, first_session_at timestamptz, last_session_ends_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.require_user();
begin
  if p_courses is null or cardinality(p_courses) > 60 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  return query
  select c.id,
         public.course_seats_left(c.id),
         (select count(*)::int from public.course_modules m where m.course_id = c.id),
         (select count(*)::int from public.lessons l where l.course_id = c.id and l.published_at is not null),
         (select count(*)::int from public.quizzes q where q.course_id = c.id),
         (select count(*)::int from public.assignments a where a.course_id = c.id),
         (select count(*)::int from public.course_sessions s where s.course_id = c.id and s.status <> 'cancelled'),
         (select min(s.starts_at) from public.course_sessions s where s.course_id = c.id and s.status <> 'cancelled'),
         (select max(s.ends_at) from public.course_sessions s where s.course_id = c.id and s.status <> 'cancelled')
  from public.courses c
  where c.id = any (p_courses) and (c.status <> 'draft' or public.manages_course(c.id));
end $$;

revoke execute on function public.discover_pattern(text) from public, anon, authenticated;
revoke execute on function public.discover_courses(text, uuid[], public.course_mode[], public.course_level[], numeric, numeric, numeric, text[], text, int, int) from public, anon, authenticated;
revoke execute on function public.discover_facets(text, uuid[], public.course_mode[], public.course_level[], numeric, numeric, numeric, text[]) from public, anon, authenticated;
revoke execute on function public.discover_suggest(text) from public, anon, authenticated;
revoke execute on function public.course_public_facts(uuid[]) from public, anon, authenticated;
grant execute on function public.discover_courses(text, uuid[], public.course_mode[], public.course_level[], numeric, numeric, numeric, text[], text, int, int) to authenticated;
grant execute on function public.discover_facets(text, uuid[], public.course_mode[], public.course_level[], numeric, numeric, numeric, text[]) to authenticated;
grant execute on function public.discover_suggest(text) to authenticated;
grant execute on function public.course_public_facts(uuid[]) to authenticated;

create index if not exists courses_summary_trgm on public.courses using gin (summary extensions.gin_trgm_ops);
