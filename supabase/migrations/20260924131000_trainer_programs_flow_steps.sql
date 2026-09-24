-- TRR-PRG-08 / TRR-PRG-09 step progress (Figma 454:27755 «جارٍ سحب الطلب» · 454:28838 «جارٍ إنشاء النسخة»).
-- Additive only: each step the screens show is now a real, separately observable server call.
--   withdraw   = withdraw_program_review (stop review + back to draft, atomic) → notify_program_reviewers
--   new version = clone_program (objectives + units/lessons) → clone_program_assignments → clone_program_materials (batched)
--                 and discard_program_clone rolls a half-built copy back so a failure leaves nothing behind.

-- ── Step «إشعار فريق المراجعة» ──────────────────────────────────────────────
create or replace function public.notify_program_reviewers(p_program uuid, p_event text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := public.require_user();
  g public.programs;
  n integer := 0;
  r record;
begin
  select * into g from public.programs where id = p_program;
  if not found or g.owner_id <> u then raise exception 'not_found' using errcode = 'P0001'; end if;
  if p_event is distinct from 'withdrawn' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  -- Only right after a real withdrawal of this program's request.
  if not exists (
    select 1 from public.program_review_requests
    where program_id = p_program and status = 'withdrawn' and decided_at > now() - interval '15 minutes'
  ) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  for r in select distinct w.user_id from public.user_workspaces w where w.kind = 'admin' loop
    perform public.notify(
      r.user_id, 'action_required', 'سُحب طلب مراجعة برنامج',
      'سحب المدرب طلب مراجعة «' || g.title || '» وعاد البرنامج مسودة.', null
    );
    n := n + 1;
  end loop;
  return n;
end $$;

-- Target of a clone step: the caller's own fresh copy (derived_from set, still a plain draft, never submitted).
create or replace function public.program_clone_target(p_target uuid)
returns public.programs
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  u uuid := public.require_user();
  t public.programs;
begin
  select * into t from public.programs where id = p_target;
  if not found or t.owner_id <> u or t.derived_from is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if t.status <> 'draft' or t.review_state <> 'draft' or t.submitted_at is not null then
    raise exception 'program_locked' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.programs s where s.id = t.derived_from and s.owner_id = u) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  return t;
end $$;

-- ── Step «نسخ الواجبات» ─────────────────────────────────────────────────────
-- Units are matched by (position, title); a unit that only holds assignments is created when missing.
create or replace function public.clone_program_assignments(p_target uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.programs := public.program_clone_target(p_target);
  n integer;
begin
  insert into public.program_units (program_id, kind, position, title, summary)
  select t.id, su.kind, su.position, su.title, su.summary
  from public.program_units su
  where su.program_id = t.derived_from
    and exists (select 1 from public.program_items i where i.unit_id = su.id and i.kind = 'assignment')
    and not exists (select 1 from public.program_units tu where tu.program_id = t.id and tu.position = su.position and tu.title = su.title);

  insert into public.program_items (program_id, unit_id, kind, position, title, summary, duration_minutes, max_score, weight_percent, due_note)
  select t.id, tu.id, i.kind, i.position, i.title, i.summary, i.duration_minutes, i.max_score, i.weight_percent, i.due_note
  from public.program_items i
  join public.program_units su on su.id = i.unit_id
  join public.program_units tu on tu.program_id = t.id and tu.position = su.position and tu.title = su.title
  where i.program_id = t.derived_from
    and i.kind = 'assignment'
    and not exists (
      select 1 from public.program_items x
      where x.unit_id = tu.id and x.kind = 'assignment' and x.position = i.position and x.title = i.title
    );
  get diagnostics n = row_count;
  return n;
end $$;

-- ── Step «نسخ المواد المرفوعة» (batched so the screen can show «١٨ من ٢٤») ──
-- Copies the file reference of each source item onto its twin in the copy. Returns what was copied in this call
-- and how many files are still left, so the client loops until remaining = 0.
create or replace function public.clone_program_materials(p_target uuid, p_limit integer default 4)
returns table (copied integer, remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.programs := public.program_clone_target(p_target);
  lim integer := greatest(1, least(coalesce(p_limit, 4), 50));
  c integer;
begin
  with pairs as (
    select ti.id as tid, si.media_path, si.media_name, si.media_type, si.media_size
    from public.program_items si
    join public.program_units su on su.id = si.unit_id
    join public.program_units tu on tu.program_id = t.id and tu.position = su.position and tu.title = su.title
    join public.program_items ti on ti.unit_id = tu.id and ti.kind = si.kind and ti.position = si.position and ti.title = si.title
    where si.program_id = t.derived_from and si.media_path is not null and ti.media_path is null
    order by su.position, si.position, si.id
    limit lim
  )
  update public.program_items x
  set media_path = pairs.media_path, media_name = pairs.media_name, media_type = pairs.media_type, media_size = pairs.media_size
  from pairs
  where x.id = pairs.tid;
  get diagnostics c = row_count;

  copied := c;
  select count(*)::integer into remaining
  from public.program_items si
  join public.program_units su on su.id = si.unit_id
  join public.program_units tu on tu.program_id = t.id and tu.position = su.position and tu.title = su.title
  join public.program_items ti on ti.unit_id = tu.id and ti.kind = si.kind and ti.position = si.position and ti.title = si.title
  where si.program_id = t.derived_from and si.media_path is not null and ti.media_path is null;
  return next;
end $$;

-- ── Roll back a copy whose later step failed («لم تُنشأ النسخة ولم يتأثر الأصل») ──
create or replace function public.discard_program_clone(p_program uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.programs := public.program_clone_target(p_program);
begin
  if t.created_at < now() - interval '1 hour'
     or exists (select 1 from public.program_declarations d where d.program_id = t.id)
     or exists (select 1 from public.program_review_requests r where r.program_id = t.id) then
    raise exception 'program_locked' using errcode = 'P0001';
  end if;
  delete from public.programs where id = t.id;
end $$;

revoke execute on function
  public.notify_program_reviewers(uuid, text), public.program_clone_target(uuid),
  public.clone_program_assignments(uuid), public.clone_program_materials(uuid, integer), public.discard_program_clone(uuid)
from public, anon, authenticated;

grant execute on function
  public.notify_program_reviewers(uuid, text), public.clone_program_assignments(uuid),
  public.clone_program_materials(uuid, integer), public.discard_program_clone(uuid)
to authenticated;
-- program_clone_target is internal (called from the functions above only).
