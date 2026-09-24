-- TRR-CRS-07 لوحة الدورة المسجَّلة: one read model for the course staff. Trainee profiles, refund requests and
-- inquiries are not readable row-by-row by trainers (RLS), so this SECURITY DEFINER function returns only what
-- the dashboard shows, and only for a course the caller manages.
create or replace function public.course_dashboard(p_course uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  n_lessons int;
  result jsonb;
begin
  perform public.require_user();
  if not (public.manages_course(p_course) or public.is_admin()) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  select count(*)::int into n_lessons from public.lessons l where l.course_id = p_course and l.published_at is not null;

  with learners as (
    select e.id, e.trainee_id, e.status, coalesce(e.confirmed_at, e.created_at) as bought_at, e.completed_at,
           coalesce(nullif(pr.full_name, ''), 'متدرب') as name, pr.avatar_path,
           (select count(*)::int from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
             where lp.course_id = p_course and lp.trainee_id = e.trainee_id and lp.completed_at is not null
               and l.published_at is not null) as done,
           (select max(lp.updated_at) from public.lesson_progress lp where lp.course_id = p_course and lp.trainee_id = e.trainee_id) as last_activity,
           (select count(*)::int from public.inquiries q where q.course_id = p_course and q.user_id = e.trainee_id and q.answered_at is null) as open_questions,
           (select rr.status::text from public.refund_requests rr where rr.enrollment_id = e.id and rr.cancelled_at is null
             order by rr.created_at desc limit 1) as refund_status,
           exists (select 1 from public.certificates c where c.enrollment_id = e.id and c.status = 'issued') as certified
    from public.enrollments e
    join public.profiles pr on pr.id = e.trainee_id
    where e.course_id = p_course and e.status in ('pending_provider', 'confirmed', 'in_progress', 'completed')
  ),
  modules as (
    select m.id, m.position, m.title,
           (select count(*)::int from public.lessons l where l.module_id = m.id and l.published_at is not null) as lessons,
           (select coalesce(sum(l.duration_seconds), 0)::int from public.lessons l where l.module_id = m.id and l.published_at is not null) as seconds
    from public.course_modules m where m.course_id = p_course
  )
  select jsonb_build_object(
    'lessons', n_lessons,
    'learners', coalesce((select jsonb_agg(jsonb_build_object(
        'enrollment_id', x.id, 'trainee_id', x.trainee_id, 'name', x.name, 'avatar_path', x.avatar_path,
        'status', x.status, 'bought_at', x.bought_at, 'completed_at', x.completed_at, 'done', x.done,
        'last_activity', x.last_activity, 'open_questions', x.open_questions, 'refund_status', x.refund_status,
        'certified', x.certified) order by x.bought_at desc) from learners x), '[]'::jsonb),
    'modules', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'position', m.position, 'title', m.title, 'lessons', m.lessons, 'seconds', m.seconds,
        'completed', (select count(*)::int from learners x
                       where m.lessons > 0 and m.lessons = (
                         select count(*) from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
                         where l.module_id = m.id and l.published_at is not null and lp.trainee_id = x.trainee_id
                           and lp.completed_at is not null))) order by m.position) from modules m), '[]'::jsonb),
    'questions', (select jsonb_build_object('count', count(*),
        'oldest_name', (select coalesce(nullif(pr.full_name, ''), 'متدرب') from public.inquiries q2 join public.profiles pr on pr.id = q2.user_id
                         where q2.course_id = p_course and q2.answered_at is null order by q2.created_at limit 1),
        'oldest_at', min(q.created_at))
      from public.inquiries q where q.course_id = p_course and q.answered_at is null),
    'ratings', (select jsonb_build_object('count', count(*),
        'unreplied', count(*) filter (where not exists (select 1 from public.rating_replies rp where rp.rating_id = r.id)),
        'lowest_unreplied', min(round((r.content_score + r.trainer_score + coalesce(r.organization_score, r.trainer_score)) / 3.0))
                              filter (where not exists (select 1 from public.rating_replies rp where rp.rating_id = r.id)))
      from public.course_ratings r where r.course_id = p_course),
    'refund_pending', (select jsonb_build_object('count', count(*) over (), 'name', coalesce(nullif(pr.full_name, ''), 'متدرب'),
        'amount', rr.amount, 'created_at', rr.created_at,
        'in_window', rr.created_at <= coalesce(e.confirmed_at, e.created_at) + interval '14 days')
      from public.refund_requests rr join public.enrollments e on e.id = rr.enrollment_id join public.profiles pr on pr.id = rr.trainee_id
      where e.course_id = p_course and rr.status = 'under_review' and rr.cancelled_at is null
      order by rr.created_at desc limit 1),
    'refunded', (select jsonb_build_object('count', count(*), 'amount', coalesce(sum(rr.amount), 0))
      from public.refund_requests rr join public.enrollments e on e.id = rr.enrollment_id
      where e.course_id = p_course and rr.status = 'approved' and rr.cancelled_at is null),
    'month_buyers', (select count(*) from learners x where x.bought_at >= date_trunc('month', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh')
  ) into result;
  return result;
end $$;

revoke execute on function public.course_dashboard(uuid) from public, anon;
grant execute on function public.course_dashboard(uuid) to authenticated;
