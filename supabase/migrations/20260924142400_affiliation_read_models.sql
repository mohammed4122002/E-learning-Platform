-- Read models for TRR-AFL-01/02/03 (counts the trainer cannot compute under RLS).

-- Public facts about a provider shown on an invitation: «جهة موثَّقة · ٤٫٦ تقييم · ٣٤ مدربًا مرتبطًا».
create or replace function public.organization_public_stats(p_org uuid)
returns table (rating numeric, rating_count int, affiliated_trainers int)
language sql stable security definer set search_path = '' as $$
  select (select round(avg(r.organization_score)::numeric, 1) from public.course_ratings r join public.courses c on c.id = r.course_id
          where c.organization_id = p_org and r.organization_score is not null),
         (select count(*)::int from public.course_ratings r join public.courses c on c.id = r.course_id
          where c.organization_id = p_org and r.organization_score is not null),
         (select count(distinct a.trainer_id)::int from public.trainer_affiliations a where a.organization_id = p_org and a.status in ('active', 'ending'));
$$;

-- Per affiliation of the caller: running courses, trainees and sales (excl. VAT) of the trainer's courses with the org.
create or replace function public.my_affiliation_stats()
returns table (affiliation_id uuid, running_courses int, trainees int, revenue numeric)
language sql stable security definer set search_path = '' as $$
  select a.id,
         (select count(*)::int from public.courses c
          where c.trainer_id = a.trainer_id and c.organization_id = a.organization_id and c.status in ('open', 'in_progress')),
         (select count(distinct e.trainee_id)::int from public.enrollments e join public.courses c on c.id = e.course_id
          where c.trainer_id = a.trainer_id and c.organization_id = a.organization_id
            and e.status in ('confirmed', 'in_progress', 'completed')),
         (select coalesce(sum(e.price_paid - coalesce(e.vat_amount, 0)), 0) from public.enrollments e join public.courses c on c.id = e.course_id
          where c.trainer_id = a.trainer_id and c.organization_id = a.organization_id
            and e.status in ('confirmed', 'in_progress', 'completed'))
  from public.trainer_affiliations a
  where a.trainer_id = auth.uid();
$$;

revoke execute on function public.organization_public_stats(uuid), public.my_affiliation_stats() from public, anon, authenticated;
grant execute on function public.organization_public_stats(uuid), public.my_affiliation_stats() to authenticated;
