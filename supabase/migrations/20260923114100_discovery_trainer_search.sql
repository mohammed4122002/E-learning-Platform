-- Discovery search also matches the trainer's public name (the search overlay links trainer suggestions to
-- /trainee/discover?q=<name>). Same signatures and grants as 20260923114000_discovery.sql.

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
      and (pat is null or c.title ilike pat or c.summary ilike pat or p.title ilike pat
           or exists (select 1 from public.profiles pr where pr.id = c.trainer_id and pr.is_public and pr.full_name ilike pat))
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
      and (pat is null or c.title ilike pat or c.summary ilike pat or p.title ilike pat
           or exists (select 1 from public.profiles pr where pr.id = c.trainer_id and pr.is_public and pr.full_name ilike pat))
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
