-- TRN-CRS-06 · صفحة بيع الدورة: preview lessons are watchable before purchase; rating breakdown for the page.

create policy "lesson media preview read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'lesson-media' and exists (
    select 1 from public.lessons l where l.media_path = storage.objects.name and l.is_preview and l.published_at is not null));

-- Star distribution of a course (rounded average of the rating axes), for the ratings block.
create or replace function public.course_rating_breakdown(p_course uuid)
returns table (stars int, count int)
language sql stable security definer set search_path = '' as $$
  select s.stars, coalesce(r.n, 0)::int
  from generate_series(1, 5) as s(stars)
  left join (
    select greatest(1, least(5, round((content_score + trainer_score + coalesce(organization_score, trainer_score)) / 3.0)))::int as stars,
           count(*) as n
    from public.course_ratings where course_id = p_course
    group by 1
  ) r on r.stars = s.stars
  order by s.stars desc;
$$;
revoke execute on function public.course_rating_breakdown(uuid) from public;
grant execute on function public.course_rating_breakdown(uuid) to anon, authenticated;

-- Public trainer stats for the trainer card (courses, learners, average rating).
create or replace function public.trainer_public_stats(p_trainer uuid)
returns table (courses int, learners int, rating numeric, ratings int)
language sql stable security definer set search_path = '' as $$
  select count(*)::int,
         coalesce(sum(learners_count), 0)::int,
         coalesce(round(sum(rating_avg * rating_count) / nullif(sum(rating_count), 0), 1), 0),
         coalesce(sum(rating_count), 0)::int
  from public.courses where trainer_id = p_trainer and status <> 'draft';
$$;
revoke execute on function public.trainer_public_stats(uuid) from public;
grant execute on function public.trainer_public_stats(uuid) to anon, authenticated;
