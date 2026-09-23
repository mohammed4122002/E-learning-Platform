-- Functions are executable by PUBLIC by default. Lock them down and grant per role explicitly.

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f' loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- Signed-in user RPCs (each one checks auth.uid() and its own business rules).
grant execute on function
  public.add_workspace(public.workspace_kind, text, text),
  public.start_enrollment(uuid, text, text),
  public.create_payment(uuid, text, text),
  public.sandbox_settle_payment(uuid, boolean),
  public.withdraw_enrollment(uuid, text),
  public.join_waitlist(uuid),
  public.leave_waitlist(uuid),
  public.accept_waitlist_invite(uuid),
  public.request_refund(uuid, text, text),
  public.open_dispute(uuid, text, text),
  public.add_dispute_attachment(uuid, text, text, integer),
  public.course_progress(uuid, uuid),
  public.record_lesson_progress(uuid, integer),
  public.get_quiz(uuid),
  public.submit_quiz(uuid, jsonb),
  public.submit_assignment(uuid, text, text),
  public.check_in(text),
  public.rate_course(uuid, integer, integer, integer, text),
  public.start_conversation(uuid, text, text),
  public.submit_identity_verification(text, text, text, text),
  public.account_deletion_blockers(),
  public.freeze_account(),
  public.is_conversation_member(uuid),
  public.require_user()
to authenticated;

-- Public catalog / verification RPCs and the RLS helpers that policies evaluate for every role.
grant execute on function
  public.verify_certificate(text),
  public.course_outline(uuid),
  public.course_seats_left(uuid),
  public.quote_enrollment(uuid, text),
  public.course_seats_taken(uuid),
  public.is_enrolled(uuid),
  public.manages_course(uuid),
  public.is_admin(),
  public.has_workspace(public.workspace_kind),
  public.is_org_member(uuid)
to anon, authenticated;

-- Not granted to any client role (trigger functions and trusted server-side operations):
-- handle_new_user, bump_conversation, refresh_course_rating, touch_updated_at, protect_profile_fields,
-- limit_workspaces, guard_course_price, forbid_update, notify, settle_payment, invite_next_waitlisted,
-- issue_certificate, expire_stale_holds.

-- Server-side settlement uses the service role (payment webhook).
grant execute on function public.settle_payment(uuid, text, text, boolean, text) to service_role;
