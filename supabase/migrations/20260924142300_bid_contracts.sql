-- /trainer/contracts/new?source=bid&id=<bidId> — contract from an accepted bid.
-- Bids live in `public.training_bids` (+ `training_requests`), built in parallel by the bids work. They are read
-- with dynamic SQL so this migration also applies to a database without them (then `bids_unavailable`).
-- Resolution order: `public.bid_contract_terms(uuid)` if the bids work provides it, otherwise the terms are built
-- here from the accepted bid (price/dates as agreed, original values from the bid itself).
create or replace function public.start_bid_contract(p_bid uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user(); r record; existing uuid; pct numeric := public.platform_commission_percent();
  terms jsonb; agreed jsonb; orig jsonb;
begin
  select c.id into existing from public.trainer_contracts c
  where c.source_type = 'bid' and c.source_id = p_bid and c.trainer_id = u and c.status in ('sent', 'signed_by_trainer', 'active');
  if existing is not null then return existing; end if;

  if to_regprocedure('public.bid_contract_terms(uuid)') is not null then
    execute 'select * from public.bid_contract_terms($1)' into r using p_bid;
    if r is null or r.trainer_id is distinct from u then raise exception 'not_found' using errcode = 'P0001'; end if;
    return public.create_contract_internal(r.organization_id, u, 'bid', p_bid, r.source_ref, r.title, r.terms, true, 5, u);
  end if;

  if to_regclass('public.training_bids') is null or to_regclass('public.training_requests') is null then
    raise exception 'bids_unavailable' using errcode = 'P0001';
  end if;

  execute $q$
    select b.id, b.trainer_id, b.status, b.reference, b.price, b.days, b.hours, b.starts_on, b.ends_on,
           coalesce(b.agreed_terms, '{}'::jsonb) as agreed_terms, q.organization_id, q.title
    from public.training_bids b join public.training_requests q on q.id = b.request_id
    where b.id = $1 $q$ into r using p_bid;
  if r is null or r.trainer_id is distinct from u then raise exception 'not_found' using errcode = 'P0001'; end if;
  if r.status <> 'accepted' then raise exception 'bid_not_accepted' using errcode = 'P0001'; end if;

  orig := jsonb_build_object('price', r.price, 'days', r.days, 'hours', r.hours, 'starts_on', r.starts_on, 'ends_on', r.ends_on);
  agreed := orig || r.agreed_terms;
  terms := jsonb_build_object(
    'scope', r.title,
    'value', (agreed->>'price')::numeric,
    'original_value', r.price,
    'currency', 'SAR',
    'days', (agreed->>'days')::int,
    'hours', (agreed->>'hours')::numeric,
    'starts_on', agreed->>'starts_on',
    'ends_on', agreed->>'ends_on',
    'original_starts_on', r.starts_on,
    'original_ends_on', r.ends_on,
    'terms_source', case when r.agreed_terms = '{}'::jsonb then 'شروط العرض المقبول' else 'ناتجة عن تفاوض' end,
    'platform_commission_percent', pct,
    'items', jsonb_build_array(
      jsonb_build_object('key', 'price', 'label', 'السعر الإجمالي', 'negotiable', true, 'original', r.price, 'agreed', (agreed->>'price')::numeric),
      jsonb_build_object('key', 'dates', 'label', 'تواريخ التنفيذ', 'negotiable', true,
                         'original', jsonb_build_array(r.starts_on, r.ends_on), 'agreed', jsonb_build_array(agreed->>'starts_on', agreed->>'ends_on')),
      jsonb_build_object('label', 'عمولة المنصة · وفق إعدادات المنصة المعتمدة', 'negotiable', false, 'note', 'يحددها نظام المنصة ولا تُعدَّل'),
      jsonb_build_object('label', 'موعد صرف المستحق', 'negotiable', false, 'note', 'بعد انتهاء الورشة وإقرار الجهة'),
      jsonb_build_object('label', 'سياسة الاسترداد', 'negotiable', false, 'note', 'السياسة الموحّدة للمنصة')),
    'history', '[]'::jsonb);
  return public.create_contract_internal(r.organization_id, u, 'bid', p_bid, r.reference, r.title, terms, true, 5, u);
end $$;

revoke execute on function public.start_bid_contract(uuid) from public, anon, authenticated;
grant execute on function public.start_bid_contract(uuid) to authenticated;
