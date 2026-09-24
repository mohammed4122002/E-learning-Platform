-- Links the bid flow (TRR-BID) to contracts (TRR-CTR): when start_bid_contract creates the contract for an
-- accepted bid, stamp training_bids.contracted_at so the expire-training-bids job no longer expires it.
create or replace function public.link_bid_contract()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source_type = 'bid' and new.source_id is not null then
    update public.training_bids set contracted_at = now()
     where id = new.source_id and contracted_at is null;
  end if;
  return new;
end $$;

revoke all on function public.link_bid_contract() from public, anon, authenticated;

create trigger trainer_contracts_link_bid
  after insert on public.trainer_contracts
  for each row execute function public.link_bid_contract();

-- Backfill contracts that already exist for bids.
update public.training_bids b set contracted_at = c.created_at
  from public.trainer_contracts c
 where c.source_type = 'bid' and c.source_id = b.id and b.contracted_at is null;
