-- QA (TRR-BID-03/04 → contracts): a contract from a bid must use the final terms. While the trainer's proposal waits
-- for the organization (awaiting_org) or the organization's counter-proposal waits for the trainer (countered), the
-- terms are not settled, so creating the contract is refused with `negotiation_open`. Additive: a BEFORE INSERT
-- guard next to trainer_contracts_link_bid; start_bid_contract itself is unchanged.
create or replace function public.guard_bid_contract_negotiation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source_type = 'bid' and new.source_id is not null and exists (
       select 1 from public.bid_negotiations n
        where n.bid_id = new.source_id and n.status in ('awaiting_org', 'countered')) then
    raise exception 'negotiation_open' using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke all on function public.guard_bid_contract_negotiation() from public, anon, authenticated;

create trigger trainer_contracts_guard_bid_negotiation
  before insert on public.trainer_contracts
  for each row execute function public.guard_bid_contract_negotiation();
