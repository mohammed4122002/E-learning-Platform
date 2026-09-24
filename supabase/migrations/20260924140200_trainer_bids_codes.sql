-- TRR-BID error codes of their own (the course codes program_not_published / invalid_dates carry course copy), and
-- «يمكنك بدء تفاوض جديد إن بقيت مهلة التعاقد» (458:31553): an expired negotiation does not use up the trainer's round.

create or replace function public.validate_bid_terms(current_terms jsonb, changes jsonb, need_reason boolean) returns void
language plpgsql stable set search_path = '' as $$
declare k text; v jsonb;
begin
  if changes is null or jsonb_typeof(changes) <> 'object' or changes = '{}'::jsonb then
    raise exception 'negotiation_empty' using errcode = 'P0001';
  end if;
  for k, v in select * from jsonb_each(changes) loop
    if k not in ('price', 'duration', 'dates', 'payment_terms') then raise exception 'term_locked' using errcode = 'P0001'; end if;
    if need_reason and char_length(trim(coalesce(v ->> 'reason', ''))) < 5 then
      raise exception 'negotiation_reason_required' using errcode = 'P0001';
    end if;
    if k = 'price' then
      if jsonb_typeof(v -> 'value') <> 'number' or (v ->> 'value')::numeric <= 0 or (v ->> 'value')::numeric > 10000000 then
        raise exception 'invalid_term' using errcode = 'P0001'; end if;
    elsif k = 'duration' then
      if coalesce((v #>> '{value,days}')::int, 0) not between 1 and 60 or coalesce((v #>> '{value,hours}')::numeric, 0) not between 1 and 500 then
        raise exception 'invalid_term' using errcode = 'P0001'; end if;
    elsif k = 'dates' then
      if (v #>> '{value,starts_on}') is null or (v #>> '{value,ends_on}') is null
         or (v #>> '{value,ends_on}')::date < (v #>> '{value,starts_on}')::date
         or (v #>> '{value,starts_on}')::date < (now() at time zone 'Asia/Riyadh')::date then
        raise exception 'invalid_term_dates' using errcode = 'P0001'; end if;
    elsif k = 'payment_terms' then
      if (v ->> 'value') not in ('single_after', 'half_upfront', 'per_day') then raise exception 'invalid_term' using errcode = 'P0001'; end if;
    end if;
  end loop;
  if public.apply_bid_terms(current_terms, changes) = current_terms then
    raise exception 'negotiation_no_change' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.save_training_bid(
  p_request uuid, p_program uuid, p_price numeric, p_hours numeric, p_message text,
  p_attachment_path text, p_attachment_name text, p_commit boolean, p_submit boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  r public.training_requests;
  b public.training_bids;
  bid_id uuid;
begin
  if not exists (select 1 from public.user_workspaces w where w.user_id = u and w.kind = 'trainer') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select * into r from public.training_requests where id = p_request for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if r.status <> 'open' or r.bids_close_at <= now() then raise exception 'request_closed' using errcode = 'P0001'; end if;
  if p_program is not null and not exists (
    select 1 from public.programs g where g.id = p_program and g.owner_id = u and g.status = 'published') then
    raise exception 'bid_program_not_published' using errcode = 'P0001';
  end if;
  if p_attachment_path is not null and split_part(p_attachment_path, '/', 1) <> u::text then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if (p_price is not null and (p_price <= 0 or p_price > 10000000)) or (p_hours is not null and (p_hours <= 0 or p_hours > 500))
     or char_length(coalesce(p_message, '')) > 4000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_submit then
    if p_program is null or p_price is null or p_hours is null or char_length(trim(coalesce(p_message, ''))) < 20 then
      raise exception 'bid_incomplete' using errcode = 'P0001';
    end if;
    if not coalesce(p_commit, false) then raise exception 'commitment_required' using errcode = 'P0001'; end if;
  end if;

  select * into b from public.training_bids where request_id = p_request and trainer_id = u for update;
  if found and b.status <> 'draft' then raise exception 'bid_exists' using errcode = 'P0001'; end if;

  insert into public.training_bids (request_id, trainer_id, program_id, price, hours, message, attachment_path, attachment_name)
  values (p_request, u, p_program, p_price, p_hours, nullif(trim(coalesce(p_message, '')), ''), p_attachment_path, p_attachment_name)
  on conflict (request_id, trainer_id) do update
    set program_id = excluded.program_id, price = excluded.price, hours = excluded.hours, message = excluded.message,
        attachment_path = coalesce(excluded.attachment_path, public.training_bids.attachment_path),
        attachment_name = coalesce(excluded.attachment_name, public.training_bids.attachment_name)
  returning id into bid_id;

  if p_submit then
    update public.training_bids
       set status = 'submitted', submitted_at = now(), committed_at = now(),
           days = r.days, starts_on = r.starts_on, ends_on = r.ends_on, payment_terms = r.payment_terms
     where id = bid_id;
    perform public.notify(m.user_id, 'bid_received', 'عرض جديد على طلبك',
                          'وصل عرض تدريبي جديد على «' || r.title || '».', null)
      from public.organization_members m where m.organization_id = r.organization_id;
  end if;
  return bid_id;
end $$;

create or replace function public.open_bid_negotiation(p_bid uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  b public.training_bids;
  nid uuid;
begin
  select * into b from public.training_bids where id = p_bid and trainer_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if b.status <> 'accepted' or b.contracted_at is not null then raise exception 'bid_not_negotiable' using errcode = 'P0001'; end if;
  if b.contract_paused_at is null and b.contract_due_at <= now() then raise exception 'contract_window_over' using errcode = 'P0001'; end if;
  select id into nid from public.bid_negotiations where bid_id = p_bid and status in ('draft', 'awaiting_org', 'countered');
  if nid is not null then return nid; end if;
  if exists (select 1 from public.bid_negotiations where bid_id = p_bid and status not in ('cancelled', 'withdrawn', 'expired')) then
    raise exception 'negotiation_used' using errcode = 'P0001';
  end if;
  insert into public.bid_negotiations (bid_id) values (p_bid) returning id into nid;
  return nid;
end $$;

