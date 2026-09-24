-- Distinct error codes for the affiliation/contract/appeal flows (reason_required and ack_required already carry
-- copy for other screens in src/lib/errors.ts).

create or replace function public.end_affiliation(p_affiliation uuid, p_reason text, p_message text, p_ack boolean)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); a public.trainer_affiliations; eff timestamptz; trainer_name text;
begin
  if not coalesce(p_ack, false) then raise exception 'end_ack_required' using errcode = 'P0001'; end if;
  if p_reason is null or p_reason not in ('direct_sales', 'high_commission', 'few_courses', 'execution_dispute', 'moved_org', 'other') then
    raise exception 'end_reason_required' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_message, '')) > 2000 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  perform public.affiliations_housekeeping();
  select * into a from public.trainer_affiliations where id = p_affiliation and trainer_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.status <> 'active' then raise exception 'affiliation_not_active' using errcode = 'P0001'; end if;
  eff := now() + make_interval(days => a.notice_days);
  update public.trainer_affiliations
  set status = case when a.notice_days = 0 then 'ended' else 'ending' end,
      end_requested_at = now(), end_effective_at = eff, ended_at = case when a.notice_days = 0 then now() end,
      ended_by = u, ended_by_party = 'trainer', end_reason = p_reason, end_message = nullif(trim(coalesce(p_message, '')), '')
  where id = a.id;
  select p.full_name into trainer_name from public.profiles p where p.id = u;
  perform public.notify_org_managers(a.organization_id, 'affiliation', 'أشعرك المدرب بإنهاء الارتباط',
    coalesce(trainer_name, 'المدرب') || ' أنهى الارتباط. يسري الإنهاء بعد ' || a.notice_days || ' يومًا، والدورات الجارية تستمر.', null);
  return eff;
end $$;

create or replace function public.org_end_affiliation(p_affiliation uuid, p_reason text, p_message text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); a public.trainer_affiliations; eff timestamptz; org_name text;
begin
  select * into a from public.trainer_affiliations where id = p_affiliation for update;
  if not found or not public.is_org_manager(a.organization_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.status <> 'active' then raise exception 'affiliation_not_active' using errcode = 'P0001'; end if;
  if p_reason is null or p_reason not in ('direct_sales', 'high_commission', 'few_courses', 'execution_dispute', 'moved_org', 'other') then
    raise exception 'end_reason_required' using errcode = 'P0001';
  end if;
  eff := now() + make_interval(days => a.notice_days);
  update public.trainer_affiliations
  set status = case when a.notice_days = 0 then 'ended' else 'ending' end, end_requested_at = now(), end_effective_at = eff,
      ended_at = case when a.notice_days = 0 then now() end, ended_by = u, ended_by_party = 'organization', end_reason = p_reason,
      end_message = nullif(trim(coalesce(p_message, '')), '')
  where id = a.id;
  select o.name into org_name from public.organizations o where o.id = a.organization_id;
  perform public.notify(a.trainer_id, 'affiliation', 'أشعرتك الجهة بإنهاء الارتباط',
    org_name || ' أنهت الارتباط. يسري الإنهاء بعد ' || a.notice_days || ' يومًا، والدورات الجارية تستمر.', '/trainer/affiliations');
  return eff;
end $$;

create or replace function public.org_terminate_contract(p_contract uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); c public.trainer_contracts; org_name text;
begin
  select * into c from public.trainer_contracts where id = p_contract for update;
  if not found or not public.is_org_manager(c.organization_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if c.status in ('terminated', 'expired') then raise exception 'contract_locked' using errcode = 'P0001'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'termination_reason_required' using errcode = 'P0001'; end if;
  update public.trainer_contracts set status = 'terminated', terminated_at = now(), terminated_by = u, termination_reason = trim(p_reason) where id = c.id;
  if c.status <> 'draft' then
    select o.name into org_name from public.organizations o where o.id = c.organization_id;
    perform public.notify(c.trainer_id, 'contract', 'أُنهي العقد', org_name || ' أنهت العقد ' || c.number || '.', '/trainer/contracts/' || c.id);
  end if;
end $$;

create or replace function public.submit_report_appeal(p_report uuid, p_basis text, p_body text, p_attachments jsonb, p_ack boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); d public.report_decisions; aid uuid; num bigint;
begin
  if public.report_target_trainer(p_report) is distinct from u then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into d from public.report_decisions where report_id = p_report for update;
  if not found then raise exception 'no_decision' using errcode = 'P0001'; end if;
  if d.outcome = 'dismissed' then raise exception 'nothing_to_appeal' using errcode = 'P0001'; end if;
  if d.accepted_at is not null then raise exception 'decision_accepted' using errcode = 'P0001'; end if;
  if exists (select 1 from public.report_appeals a where a.decision_id = d.id) then raise exception 'appeal_exists' using errcode = 'P0001'; end if;
  if now() > d.appeal_deadline then raise exception 'appeal_window_closed' using errcode = 'P0001'; end if;
  if not coalesce(p_ack, false) then raise exception 'appeal_ack_required' using errcode = 'P0001'; end if;
  if p_basis is null or p_basis not in ('new_evidence', 'fact_error', 'disproportionate') then raise exception 'basis_required' using errcode = 'P0001'; end if;
  if char_length(trim(coalesce(p_body, ''))) < 20 then raise exception 'appeal_too_short' using errcode = 'P0001'; end if;
  if p_attachments is not null and (jsonb_typeof(p_attachments) <> 'array' or jsonb_array_length(p_attachments) > 5) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb)) e
             where coalesce(e->>'path', '') not like u::text || '/%') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  insert into public.report_appeals (decision_id, report_id, trainer_id, basis, body, attachments, acknowledged)
  values (d.id, p_report, u, p_basis, left(trim(p_body), 4000), coalesce(p_attachments, '[]'::jsonb), true)
  returning id into aid;
  select report_number into num from public.violation_reports where id = p_report;
  insert into public.notifications (user_id, kind, title, body, link)
  select w.user_id, 'report', 'تظلّم جديد على قرار بلاغ', 'قدّم المدرب تظلّمًا على قرار البلاغ RPT-' || num || '.', null
  from public.user_workspaces w where w.kind = 'admin' and w.user_id is distinct from d.decided_by;
  return aid;
end $$;
