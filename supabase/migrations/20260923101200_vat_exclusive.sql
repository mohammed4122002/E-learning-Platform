-- Figma "TG · Configuration": Tax/VAT Rate = 15, Tax/Inclusive = false.
-- Course prices are VAT-exclusive: total = (price − discount) + 15% VAT.

alter table public.enrollments add column vat_amount numeric(10, 2) not null default 0;

insert into public.app_settings (key, value) values ('vat_rate_percent', '15'::jsonb)
on conflict (key) do nothing;

create or replace function public.vat_rate() returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'vat_rate_percent'), 15);
$$;

drop function public.start_enrollment(uuid, text, text);
drop function public.accept_waitlist_invite(uuid);
drop function public.quote_enrollment(uuid, text);

create function public.quote_enrollment(p_course uuid, p_code text default null)
returns table (list_price numeric, discount numeric, subtotal numeric, vat numeric, total numeric, currency text, code_status text)
language plpgsql stable security definer set search_path = '' as $$
declare
  c public.courses;
  d public.discount_codes;
  disc numeric := 0;
  st text := 'none';
  sub numeric;
  tax numeric;
begin
  select * into c from public.courses where id = p_course and status in ('open', 'in_progress');
  if not found then raise exception 'course_unavailable' using errcode = 'P0001'; end if;
  if p_code is not null and trim(p_code) <> '' then
    select * into d from public.discount_codes x
    where x.code = upper(trim(p_code)) and x.active
      and (x.course_id is null or x.course_id = p_course)
      and (x.valid_until is null or x.valid_until > now())
      and (x.max_uses is null or x.used_count < x.max_uses);
    if found then
      disc := least(c.price, coalesce(round(c.price * d.percent_off / 100, 2), d.amount_off));
      st := 'applied';
    else
      st := 'invalid';
    end if;
  end if;
  sub := c.price - disc;
  tax := round(sub * public.vat_rate() / 100, 2);
  return query select c.price, disc, sub, tax, sub + tax, c.currency, st;
end $$;

create function public.start_enrollment(p_course uuid, p_code text default null, p_funding text default 'self')
returns table (enrollment_id uuid, status public.enrollment_status, hold_expires_at timestamptz, total numeric)
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  c public.courses;
  q record;
  e public.enrollments;
  code_id uuid;
begin
  -- Lock the course row so two buyers cannot take the last seat together (BR-L7).
  select * into c from public.courses where id = p_course for update;
  if not found or c.status not in ('open', 'in_progress') or (c.mode <> 'recorded' and c.status <> 'open') then
    raise exception 'course_unavailable' using errcode = 'P0001';
  end if;
  if p_funding not in ('self', 'employer', 'sponsored') then raise exception 'invalid_input' using errcode = 'P0001'; end if;

  select * into e from public.enrollments x
  where x.course_id = p_course and x.trainee_id = u and x.status not in ('withdrawn', 'cancelled', 'access_revoked');
  if found then
    if e.status = 'pending_payment' and e.hold_expires_at > now() then
      return query select e.id, e.status, e.hold_expires_at, e.price_paid;
      return;
    elsif e.status = 'pending_payment' then
      update public.enrollments set status = 'cancelled', ended_at = now(), end_reason = 'hold_expired' where id = e.id;
    else
      raise exception 'already_enrolled' using errcode = 'P0001';
    end if;
  end if;

  if c.capacity is not null and public.course_seats_taken(c.id) >= c.capacity then
    raise exception 'course_full' using errcode = 'P0001';
  end if;

  select * into q from public.quote_enrollment(p_course, p_code);
  if q.code_status = 'invalid' then raise exception 'invalid_discount_code' using errcode = 'P0001'; end if;
  if q.code_status = 'applied' then
    select id into code_id from public.discount_codes where code = upper(trim(p_code));
  end if;

  if q.total = 0 then
    insert into public.enrollments (course_id, trainee_id, status, list_price, price_paid, vat_amount, currency, discount_code_id, funding, confirmed_at)
    values (p_course, u, case when c.requires_provider_approval then 'pending_provider' else 'confirmed' end,
            q.list_price, 0, 0, q.currency, code_id, p_funding,
            case when c.requires_provider_approval then null else now() end)
    returning * into e;
    if e.status = 'confirmed' then
      update public.courses set learners_count = learners_count + 1 where id = p_course;
      perform public.notify(u, 'enrollment_confirmed', 'تم تأكيد تسجيلك', c.title, '/trainee/trainings/' || e.id);
    else
      perform public.notify(u, 'enrollment_pending_provider', 'طلب تسجيلك بانتظار موافقة الجهة', c.title, '/trainee/trainings/' || e.id);
    end if;
    if code_id is not null then update public.discount_codes set used_count = used_count + 1 where id = code_id; end if;
  else
    insert into public.enrollments (course_id, trainee_id, status, list_price, price_paid, vat_amount, currency, discount_code_id, funding, hold_expires_at)
    values (p_course, u, 'pending_payment', q.list_price, q.total, q.vat, q.currency, code_id, p_funding, now() + interval '15 minutes')
    returning * into e;
  end if;
  return query select e.id, e.status, e.hold_expires_at, e.price_paid;
end $$;

create function public.accept_waitlist_invite(p_entry uuid)
returns table (enrollment_id uuid, status public.enrollment_status, hold_expires_at timestamptz, total numeric)
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); w public.waitlist_entries;
begin
  select * into w from public.waitlist_entries where id = p_entry and trainee_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if w.status <> 'invited' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if w.invite_expires_at <= now() then
    update public.waitlist_entries set status = 'expired' where id = w.id;
    perform public.invite_next_waitlisted(w.course_id);
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;
  update public.waitlist_entries set status = 'accepted' where id = w.id;
  return query select * from public.start_enrollment(w.course_id, null, 'self');
end $$;

-- Receipt carries the VAT computed at enrollment time.
create or replace function public.settle_payment(p_payment uuid, p_provider text, p_provider_ref text, p_succeeded boolean, p_failure text default null)
returns public.payment_status language plpgsql security definer set search_path = '' as $$
declare
  p public.payments;
  e public.enrollments;
  c public.courses;
begin
  select * into p from public.payments where id = p_payment for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if p.status in ('succeeded', 'failed', 'expired', 'refunded') then return p.status; end if;
  select * into e from public.enrollments where id = p.enrollment_id for update;
  select * into c from public.courses where id = e.course_id;
  if p_succeeded then
    update public.payments set status = 'succeeded', provider = p_provider, provider_ref = p_provider_ref where id = p.id;
    insert into public.receipts (payment_id, amount, vat_amount, currency) values (p.id, p.amount, e.vat_amount, p.currency);
    update public.enrollments set
      status = case when c.requires_provider_approval then 'pending_provider'::public.enrollment_status else 'confirmed' end,
      confirmed_at = case when c.requires_provider_approval then null else now() end,
      hold_expires_at = null
    where id = e.id;
    update public.courses set price_locked_at = coalesce(price_locked_at, now()),
      learners_count = learners_count + 1 where id = c.id;
    if e.discount_code_id is not null then
      update public.discount_codes set used_count = used_count + 1 where id = e.discount_code_id;
    end if;
    perform public.notify(e.trainee_id, 'payment_succeeded', 'تمت عملية الدفع بنجاح', c.title, '/trainee/trainings/' || e.id);
    return 'succeeded';
  else
    update public.payments set status = 'failed', provider = p_provider, provider_ref = p_provider_ref,
      failure_reason = left(coalesce(p_failure, 'declined'), 200) where id = p.id;
    return 'failed';
  end if;
end $$;

revoke execute on function public.vat_rate() from public, anon, authenticated;
revoke execute on function public.quote_enrollment(uuid, text) from public;
revoke execute on function public.start_enrollment(uuid, text, text) from public, anon;
revoke execute on function public.accept_waitlist_invite(uuid) from public, anon;
grant execute on function public.quote_enrollment(uuid, text) to anon, authenticated;
grant execute on function public.start_enrollment(uuid, text, text) to authenticated;
grant execute on function public.accept_waitlist_invite(uuid) to authenticated;
revoke execute on function public.settle_payment(uuid, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.settle_payment(uuid, text, text, boolean, text) to service_role;

-- Public marketing content for the auth screens (PUB-AUT-01/02 value panel), editable without a deploy.
insert into public.app_settings (key, value) values
  ('auth_value_panel', jsonb_build_object(
     'stats', jsonb_build_array(
        jsonb_build_object('icon', 'users', 'value', '+١٥٬٠٠٠', 'label', 'متدرب نشط على المنصة'),
        jsonb_build_object('icon', 'trending-up', 'value', '٩٨٪', 'label', 'نسبة رضا المتدربين'),
        jsonb_build_object('icon', 'clock', 'value', 'أقل من دقيقتين', 'label', 'متوسط زمن التسجيل'),
        jsonb_build_object('icon', 'star', 'value', '٤٫٩ / ٥', 'label', 'متوسط تقييم البرامج')),
     'testimonial', jsonb_build_object('name', 'سالم الحارثي', 'role', 'متدرب · إدارة المشاريع', 'initials', 'س ح', 'rating', 5,
        'quote', '«التسجيل كان بسيطًا جدًا، وشهادتي وصلت مباشرة بعد انتهاء الدورة ومعها رابط تحقق رسمي.»')))
on conflict (key) do nothing;

create policy app_settings_public_read on public.app_settings for select
  using (key in ('auth_value_panel', 'vat_rate_percent'));
