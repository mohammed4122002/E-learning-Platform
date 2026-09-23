-- Row Level Security. Every public table has RLS on. State changes with business rules go through
-- security-definer RPCs (see *_rpc.sql); direct writes are only allowed for simple owner-scoped rows.

create or replace function public.is_enrolled(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollments e
    where e.course_id = c and e.trainee_id = auth.uid()
      and e.status in ('confirmed', 'in_progress', 'completed')
  );
$$;

-- Trainer of the course, or a member of the organization that runs it.
create or replace function public.manages_course(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.courses k
    where k.id = c and (k.trainer_id = auth.uid() or (k.organization_id is not null and public.is_org_member(k.organization_id)))
  );
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','organization_members','user_workspaces','categories','programs','program_versions',
    'courses','course_modules','lessons','course_sessions','discount_codes','enrollments','payments','receipts',
    'waitlist_entries','lesson_progress','attendance','attendance_codes','quizzes','quiz_attempts','assignments',
    'assignment_submissions','certificates','external_certificates','course_ratings','trainee_preferences',
    'experiences','favorites','follows','inquiries','notifications','conversations','conversation_participants',
    'messages','refund_requests','disputes','dispute_attachments','violation_reports','identity_verifications',
    'help_articles'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- profiles: public fields of public profiles are readable; own row fully.
create policy profiles_read on public.profiles for select
  using (id = auth.uid() or is_public or public.is_admin());
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_read on public.organizations for select using (true);
create policy organizations_update on public.organizations for update
  using (public.is_org_member(id) or public.is_admin());
create policy org_members_read on public.organization_members for select
  using (user_id = auth.uid() or public.is_org_member(organization_id) or public.is_admin());

create policy workspaces_read_own on public.user_workspaces for select using (user_id = auth.uid() or public.is_admin());

create policy categories_read on public.categories for select using (true);
create policy help_read on public.help_articles for select using (published or public.is_admin());

-- Catalog: published content is public; owners see their drafts.
create policy programs_read on public.programs for select
  using (status <> 'draft' or owner_id = auth.uid()
         or (organization_id is not null and public.is_org_member(organization_id)) or public.is_admin());
create policy program_versions_read on public.program_versions for select
  using (exists (select 1 from public.programs p where p.id = program_id));
create policy courses_read on public.courses for select
  using (status <> 'draft' or public.manages_course(id) or public.is_admin());
create policy course_modules_read on public.course_modules for select
  using (exists (select 1 from public.courses k where k.id = course_id));
create policy course_sessions_read on public.course_sessions for select
  using (exists (select 1 from public.courses k where k.id = course_id));
-- Lesson material is only for enrolled trainees, previews and course staff.
-- The public syllabus is served by course_outline() without media.
create policy lessons_read on public.lessons for select
  using (is_preview or public.is_enrolled(course_id) or public.manages_course(course_id) or public.is_admin());

create policy discount_codes_staff on public.discount_codes for select
  using ((course_id is not null and public.manages_course(course_id)) or public.is_admin());

-- Enrollment & money: the trainee sees their own; course staff see their course (BR-R1 is enforced in the app layer for payment data).
create policy enrollments_read on public.enrollments for select
  using (trainee_id = auth.uid() or public.manages_course(course_id) or public.is_admin());
create policy payments_read on public.payments for select
  using (trainee_id = auth.uid() or public.is_admin());
create policy receipts_read on public.receipts for select
  using (exists (select 1 from public.payments p where p.id = payment_id and (p.trainee_id = auth.uid() or public.is_admin())));
create policy waitlist_read on public.waitlist_entries for select
  using (trainee_id = auth.uid() or public.manages_course(course_id) or public.is_admin());

create policy lesson_progress_read on public.lesson_progress for select
  using (trainee_id = auth.uid() or public.manages_course(course_id));
create policy attendance_read on public.attendance for select
  using (trainee_id = auth.uid() or exists (select 1 from public.course_sessions s where s.id = session_id and public.manages_course(s.course_id)));
create policy attendance_codes_staff on public.attendance_codes for select
  using (exists (select 1 from public.course_sessions s where s.id = session_id and public.manages_course(s.course_id)));

-- Quizzes: trainees read them through get_quiz() which strips the answers.
create policy quizzes_staff on public.quizzes for select using (public.manages_course(course_id) or public.is_admin());
create policy quiz_attempts_read on public.quiz_attempts for select
  using (trainee_id = auth.uid() or exists (select 1 from public.quizzes q where q.id = quiz_id and public.manages_course(q.course_id)));
create policy assignments_read on public.assignments for select
  using (public.is_enrolled(course_id) or public.manages_course(course_id) or public.is_admin());
create policy submissions_read on public.assignment_submissions for select
  using (trainee_id = auth.uid() or exists (select 1 from public.assignments a where a.id = assignment_id and public.manages_course(a.course_id)));

create policy certificates_read on public.certificates for select
  using (trainee_id = auth.uid() or public.manages_course(course_id) or public.is_admin());
create policy external_certs_read on public.external_certificates for select using (trainee_id = auth.uid() or public.is_admin());
create policy external_certs_insert on public.external_certificates for insert
  with check (trainee_id = auth.uid() and status = 'pending' and reviewer_note is null);
create policy external_certs_update on public.external_certificates for update
  using (trainee_id = auth.uid() and status in ('pending', 'needs_changes'))
  with check (trainee_id = auth.uid() and status = 'pending' and reviewer_note is null);
create policy external_certs_delete on public.external_certificates for delete
  using (trainee_id = auth.uid() and status <> 'verified');

create policy ratings_read on public.course_ratings for select using (true);

-- Owner-scoped rows.
create policy prefs_own on public.trainee_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy experiences_read on public.experiences for select
  using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = user_id and p.is_public));
create policy experiences_write on public.experiences for insert with check (user_id = auth.uid());
create policy experiences_update on public.experiences for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy experiences_delete on public.experiences for delete using (user_id = auth.uid());
create policy favorites_own on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy follows_own on public.follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy inquiries_read on public.inquiries for select
  using (user_id = auth.uid() or public.manages_course(course_id));
create policy inquiries_insert on public.inquiries for insert
  with check (user_id = auth.uid() and answer is null and answered_at is null);

create policy notifications_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());

create policy conversations_read on public.conversations for select using (public.is_conversation_member(id));
create policy participants_read on public.conversation_participants for select using (public.is_conversation_member(conversation_id));
create policy participants_mark_read on public.conversation_participants for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy messages_read on public.messages for select using (public.is_conversation_member(conversation_id));
create policy messages_send on public.messages for insert
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));

create policy refunds_read on public.refund_requests for select using (trainee_id = auth.uid() or public.is_admin());
create policy disputes_read on public.disputes for select using (trainee_id = auth.uid() or public.is_admin());
create policy dispute_attachments_read on public.dispute_attachments for select
  using (exists (select 1 from public.disputes d where d.id = dispute_id and (d.trainee_id = auth.uid() or public.is_admin())));
create policy reports_insert on public.violation_reports for insert
  with check (reporter_id = auth.uid() and status = 'open');
create policy reports_read on public.violation_reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy identity_read on public.identity_verifications for select using (user_id = auth.uid() or public.is_admin());
