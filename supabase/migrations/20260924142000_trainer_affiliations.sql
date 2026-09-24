-- TRR-AFL-01/02/03 · Trainer ↔ provider-organization affiliations.
-- Invitations go from an organization to a trainer (terms + expiry). Accepting one creates an affiliation;
-- ending one starts the notice period (default 30 days) after which it ends. Running courses are not touched;
-- the organization cannot create new courses for the trainer once the affiliation is ending/ended.
-- The provider workspace (built later) uses the org_* RPCs below as-is.

-- ── Tables ───────────────────────────────────────────────────────────────────
create table public.affiliation_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid references public.profiles (id) on delete set null,
  -- Proposed terms (copied to the affiliation on acceptance).
  commission_percent numeric(5, 2) not null check (commission_percent >= 0 and commission_percent <= 90),
  scope_label text not null check (char_length(scope_label) between 2 and 200),
  scope_program_ids uuid[] not null default '{}',
  exclusive boolean not null default false,
  term_months int not null default 12 check (term_months between 1 and 60),
  renewable boolean not null default true,
  notice_days int not null default 30 check (notice_days between 0 and 180),
  execution_scope text check (char_length(execution_scope) <= 200),
  message text check (char_length(message) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index affiliation_invitations_trainer_idx on public.affiliation_invitations (trainer_id, status, expires_at);
create index affiliation_invitations_org_idx on public.affiliation_invitations (organization_id, status);
create index affiliation_invitations_invited_by_idx on public.affiliation_invitations (invited_by);
-- One open invitation per organization/trainer pair.
create unique index affiliation_invitations_one_pending on public.affiliation_invitations (organization_id, trainer_id) where status = 'pending';
create trigger affiliation_invitations_touch before update on public.affiliation_invitations
  for each row execute function public.touch_updated_at();

create table public.trainer_affiliations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  invitation_id uuid unique references public.affiliation_invitations (id) on delete set null,
  commission_percent numeric(5, 2) not null check (commission_percent >= 0 and commission_percent <= 90),
  scope_label text not null,
  scope_program_ids uuid[] not null default '{}',
  exclusive boolean not null default false,
  term_months int not null default 12,
  renewable boolean not null default true,
  notice_days int not null default 30 check (notice_days between 0 and 180),
  execution_scope text,
  -- active → ending (notice given, end_effective_at set) → ended
  status text not null default 'active' check (status in ('active', 'ending', 'ended')),
  started_at timestamptz not null default now(),
  end_requested_at timestamptz,
  end_effective_at timestamptz,
  ended_at timestamptz,
  ended_by uuid references public.profiles (id) on delete set null,
  ended_by_party text check (ended_by_party in ('trainer', 'organization')),
  end_reason text check (end_reason in ('direct_sales', 'high_commission', 'few_courses', 'execution_dispute', 'moved_org', 'other')),
  end_message text check (char_length(end_message) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'active') = (end_effective_at is null))
);
create index trainer_affiliations_trainer_idx on public.trainer_affiliations (trainer_id, status);
create index trainer_affiliations_org_idx on public.trainer_affiliations (organization_id, status);
create index trainer_affiliations_ended_by_idx on public.trainer_affiliations (ended_by);
create unique index trainer_affiliations_one_live on public.trainer_affiliations (organization_id, trainer_id) where status in ('active', 'ending');
create trigger trainer_affiliations_touch before update on public.trainer_affiliations
  for each row execute function public.touch_updated_at();

alter table public.affiliation_invitations enable row level security;
alter table public.trainer_affiliations enable row level security;

-- Read: the trainer (not while an invitation is still being prepared — invitations are created as pending),
-- members of the organization, admins. Writes only through the RPCs below.
create policy affiliation_invitations_read on public.affiliation_invitations for select to authenticated
  using (trainer_id = (select auth.uid()) or public.is_org_member(organization_id) or public.is_admin());
create policy trainer_affiliations_read on public.trainer_affiliations for select to authenticated
  using (trainer_id = (select auth.uid()) or public.is_org_member(organization_id) or public.is_admin());

-- ── Helpers ──────────────────────────────────────────────────────────────────
create or replace function public.is_org_manager(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m
                 where m.organization_id = p_org and m.user_id = auth.uid() and m.role in ('owner', 'admin'));
$$;

-- Notify every owner/admin of an organization.
create or replace function public.notify_org_managers(p_org uuid, p_kind text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, link)
  select m.user_id, p_kind, p_title, p_body, p_link
  from public.organization_members m
  where m.organization_id = p_org and m.role in ('owner', 'admin');
$$;

-- Lazy status refresh (also run by pg_cron): expire invitations, finish notice periods.
create or replace function public.affiliations_housekeeping() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.affiliation_invitations set status = 'expired', responded_at = coalesce(responded_at, expires_at)
  where status = 'pending' and expires_at <= now();
  update public.trainer_affiliations set status = 'ended', ended_at = end_effective_at
  where status = 'ending' and end_effective_at <= now();
end $$;

-- ── Trainer RPCs ─────────────────────────────────────────────────────────────
create or replace function public.accept_affiliation_invitation(p_invitation uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); i public.affiliation_invitations; aid uuid; org_name text; trainer_name text;
begin
  perform public.affiliations_housekeeping();
  select * into i from public.affiliation_invitations where id = p_invitation and trainer_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if i.status = 'expired' then raise exception 'invitation_expired' using errcode = 'P0001'; end if;
  if i.status <> 'pending' then raise exception 'invitation_not_pending' using errcode = 'P0001'; end if;
  if exists (select 1 from public.trainer_affiliations a where a.organization_id = i.organization_id and a.trainer_id = u and a.status in ('active', 'ending')) then
    raise exception 'already_affiliated' using errcode = 'P0001';
  end if;
  -- An exclusive affiliation cannot coexist with other live affiliations (and vice versa).
  if i.exclusive and exists (select 1 from public.trainer_affiliations a where a.trainer_id = u and a.status in ('active', 'ending')) then
    raise exception 'exclusive_conflict' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.trainer_affiliations a where a.trainer_id = u and a.status in ('active', 'ending') and a.exclusive) then
    raise exception 'exclusive_conflict' using errcode = 'P0001';
  end if;

  update public.affiliation_invitations set status = 'accepted', responded_at = now() where id = i.id;
  insert into public.trainer_affiliations (organization_id, trainer_id, invitation_id, commission_percent, scope_label, scope_program_ids,
                                           exclusive, term_months, renewable, notice_days, execution_scope)
  values (i.organization_id, u, i.id, i.commission_percent, i.scope_label, i.scope_program_ids,
          i.exclusive, i.term_months, i.renewable, i.notice_days, i.execution_scope)
  returning id into aid;

  select o.name into org_name from public.organizations o where o.id = i.organization_id;
  select p.full_name into trainer_name from public.profiles p where p.id = u;
  perform public.notify_org_managers(i.organization_id, 'affiliation',
    'قبل المدرب دعوة الارتباط', coalesce(trainer_name, 'المدرب') || ' قبل دعوة الارتباط. أصبح الارتباط نشطًا.', null);
  perform public.notify(u, 'affiliation', 'تم إنشاء الارتباط', 'أصبح ارتباطك مع ' || org_name || ' نشطًا.', '/trainer/affiliations');
  return aid;
end $$;

create or replace function public.decline_affiliation_invitation(p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); i public.affiliation_invitations; trainer_name text;
begin
  perform public.affiliations_housekeeping();
  select * into i from public.affiliation_invitations where id = p_invitation and trainer_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if i.status = 'expired' then raise exception 'invitation_expired' using errcode = 'P0001'; end if;
  if i.status <> 'pending' then raise exception 'invitation_not_pending' using errcode = 'P0001'; end if;
  update public.affiliation_invitations set status = 'declined', responded_at = now() where id = i.id;
  select p.full_name into trainer_name from public.profiles p where p.id = u;
  -- «يُبلَّغ المعهد بلا سبب»
  perform public.notify_org_managers(i.organization_id, 'affiliation', 'اعتذر المدرب عن دعوة الارتباط',
    coalesce(trainer_name, 'المدرب') || ' اعتذر عن دعوة الارتباط.', null);
end $$;

-- «أنهِ الارتباط»: starts the notice period; the affiliation ends at end_effective_at.
create or replace function public.end_affiliation(p_affiliation uuid, p_reason text, p_message text, p_ack boolean)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); a public.trainer_affiliations; eff timestamptz; trainer_name text;
begin
  if not coalesce(p_ack, false) then raise exception 'ack_required' using errcode = 'P0001'; end if;
  if p_reason is null or p_reason not in ('direct_sales', 'high_commission', 'few_courses', 'execution_dispute', 'moved_org', 'other') then
    raise exception 'reason_required' using errcode = 'P0001';
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

-- «تراجع — أبقِ الارتباط»: withdraw the trainer's own notice before it takes effect.
create or replace function public.cancel_affiliation_end(p_affiliation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); a public.trainer_affiliations; trainer_name text;
begin
  perform public.affiliations_housekeeping();
  select * into a from public.trainer_affiliations where id = p_affiliation and trainer_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.status <> 'ending' or a.ended_by_party is distinct from 'trainer' then raise exception 'affiliation_not_ending' using errcode = 'P0001'; end if;
  update public.trainer_affiliations
  set status = 'active', end_requested_at = null, end_effective_at = null, ended_by = null, ended_by_party = null, end_reason = null, end_message = null
  where id = a.id;
  select p.full_name into trainer_name from public.profiles p where p.id = u;
  perform public.notify_org_managers(a.organization_id, 'affiliation', 'تراجع المدرب عن إنهاء الارتباط',
    coalesce(trainer_name, 'المدرب') || ' تراجع عن الإنهاء. الارتباط مستمر.', null);
end $$;

-- «تفاوض على الشروط» / «راسل الجهة»: a conversation between the trainer and the organization's managers.
-- Reuses an existing conversation with the same subject.
create or replace function public.start_org_conversation(p_org uuid, p_subject text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); cid uuid; subj text := left(trim(coalesce(p_subject, '')), 200);
begin
  if char_length(subj) < 2 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  -- Only parties that already have a relationship (invitation, affiliation or contract) may open one.
  if not exists (select 1 from public.affiliation_invitations i where i.organization_id = p_org and i.trainer_id = u)
     and not exists (select 1 from public.trainer_affiliations a where a.organization_id = p_org and a.trainer_id = u)
     and not (to_regclass('public.trainer_contracts') is not null
              and exists (select 1 from public.trainer_contracts c where c.organization_id = p_org and c.trainer_id = u and c.status <> 'draft')) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select c.id into cid from public.conversations c
  join public.conversation_participants me on me.conversation_id = c.id and me.user_id = u
  where c.subject = subj and c.course_id is null
    and exists (select 1 from public.conversation_participants p join public.organization_members m on m.user_id = p.user_id
                where p.conversation_id = c.id and m.organization_id = p_org)
  order by c.created_at desc limit 1;
  if cid is not null then return cid; end if;
  insert into public.conversations (subject) values (subj) returning id into cid;
  insert into public.conversation_participants (conversation_id, user_id, last_read_at) values (cid, u, now());
  insert into public.conversation_participants (conversation_id, user_id)
  select cid, m.user_id from public.organization_members m where m.organization_id = p_org and m.role in ('owner', 'admin') and m.user_id <> u
  on conflict do nothing;
  return cid;
end $$;

-- ── Organization RPCs (provider workspace) ───────────────────────────────────
create or replace function public.org_send_affiliation_invitation(
  p_org uuid, p_trainer uuid, p_commission numeric, p_scope_label text, p_scope_programs uuid[], p_exclusive boolean,
  p_term_months int, p_notice_days int, p_execution_scope text, p_message text, p_expires_days int default 7)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); iid uuid; org public.organizations;
begin
  if not public.is_org_manager(p_org) then raise exception 'forbidden' using errcode = 'P0001'; end if;
  select * into org from public.organizations where id = p_org;
  if org.kind <> 'provider' then raise exception 'not_provider' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.user_workspaces w where w.user_id = p_trainer and w.kind = 'trainer') then
    raise exception 'not_a_trainer' using errcode = 'P0001';
  end if;
  if p_trainer = u then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if coalesce(p_expires_days, 0) not between 1 and 30 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  perform public.affiliations_housekeeping();
  if exists (select 1 from public.trainer_affiliations a where a.organization_id = p_org and a.trainer_id = p_trainer and a.status in ('active', 'ending')) then
    raise exception 'already_affiliated' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.affiliation_invitations i where i.organization_id = p_org and i.trainer_id = p_trainer and i.status = 'pending') then
    raise exception 'invitation_pending' using errcode = 'P0001';
  end if;
  insert into public.affiliation_invitations (organization_id, trainer_id, invited_by, commission_percent, scope_label, scope_program_ids,
                                              exclusive, term_months, renewable, notice_days, execution_scope, message, expires_at)
  values (p_org, p_trainer, u, p_commission, trim(p_scope_label), coalesce(p_scope_programs, '{}'), coalesce(p_exclusive, false),
          coalesce(p_term_months, 12), true, coalesce(p_notice_days, 30), nullif(trim(coalesce(p_execution_scope, '')), ''),
          nullif(trim(coalesce(p_message, '')), ''), now() + make_interval(days => p_expires_days))
  returning id into iid;
  perform public.notify(p_trainer, 'affiliation', 'دعوة ارتباط جديدة', org.name || ' يدعوك للارتباط. راجع الشروط قبل أن تقرر.',
                        '/trainer/affiliations/invitations/' || iid);
  return iid;
end $$;

create or replace function public.org_withdraw_affiliation_invitation(p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare i public.affiliation_invitations;
begin
  perform public.require_user();
  select * into i from public.affiliation_invitations where id = p_invitation for update;
  if not found or not public.is_org_manager(i.organization_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if i.status <> 'pending' then raise exception 'invitation_not_pending' using errcode = 'P0001'; end if;
  update public.affiliation_invitations set status = 'withdrawn', responded_at = now() where id = i.id;
  perform public.notify(i.trainer_id, 'affiliation', 'سُحبت دعوة الارتباط', 'سحبت الجهة دعوة الارتباط المرسلة إليك.', '/trainer/affiliations');
end $$;

create or replace function public.org_end_affiliation(p_affiliation uuid, p_reason text, p_message text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); a public.trainer_affiliations; eff timestamptz; org_name text;
begin
  select * into a from public.trainer_affiliations where id = p_affiliation for update;
  if not found or not public.is_org_manager(a.organization_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.status <> 'active' then raise exception 'affiliation_not_active' using errcode = 'P0001'; end if;
  if p_reason is null or p_reason not in ('direct_sales', 'high_commission', 'few_courses', 'execution_dispute', 'moved_org', 'other') then
    raise exception 'reason_required' using errcode = 'P0001';
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

-- ── Effect on courses: no new courses for the trainer once the affiliation is ending/ended ──────────────
-- Only organizations that have an affiliation record with the trainer are checked, so courses of providers
-- that predate affiliations are unaffected.
create or replace function public.guard_affiliated_course() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.organization_id is not null and new.trainer_id is not null
     and exists (select 1 from public.trainer_affiliations a where a.organization_id = new.organization_id and a.trainer_id = new.trainer_id)
     and not exists (select 1 from public.trainer_affiliations a where a.organization_id = new.organization_id and a.trainer_id = new.trainer_id and a.status = 'active') then
    raise exception 'affiliation_not_active' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger courses_affiliation_guard before insert on public.courses
  for each row execute function public.guard_affiliated_course();

-- ── Jobs ─────────────────────────────────────────────────────────────────────
select cron.schedule('affiliations-housekeeping', '*/15 * * * *', $$select public.affiliations_housekeeping()$$);

-- ── Privileges ───────────────────────────────────────────────────────────────
revoke execute on function
  public.is_org_manager(uuid), public.notify_org_managers(uuid, text, text, text, text), public.affiliations_housekeeping(),
  public.accept_affiliation_invitation(uuid), public.decline_affiliation_invitation(uuid),
  public.end_affiliation(uuid, text, text, boolean), public.cancel_affiliation_end(uuid), public.start_org_conversation(uuid, text),
  public.org_send_affiliation_invitation(uuid, uuid, numeric, text, uuid[], boolean, int, int, text, text, int),
  public.org_withdraw_affiliation_invitation(uuid), public.org_end_affiliation(uuid, text, text),
  public.guard_affiliated_course()
from public, anon, authenticated;
grant execute on function
  public.is_org_manager(uuid), public.affiliations_housekeeping(),
  public.accept_affiliation_invitation(uuid), public.decline_affiliation_invitation(uuid),
  public.end_affiliation(uuid, text, text, boolean), public.cancel_affiliation_end(uuid), public.start_org_conversation(uuid, text),
  public.org_send_affiliation_invitation(uuid, uuid, numeric, text, uuid[], boolean, int, int, text, text, int),
  public.org_withdraw_affiliation_invitation(uuid), public.org_end_affiliation(uuid, text, text)
to authenticated;
