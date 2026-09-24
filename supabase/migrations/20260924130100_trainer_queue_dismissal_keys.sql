-- TRR-QUE-01 «ليس الآن» / «إخفاء من الطابور»: the trainer queue stores its dismissals as
-- `trainer:<kind>:<ref>` (e.g. trainer:program_draft:<uuid>, trainer:availability:calendar), which the original
-- trainee-only check (`<kind>:<uuid>`) rejected, so every trainer dismissal failed. Additive: trainee keys are unchanged.
alter table public.queue_dismissals drop constraint if exists queue_dismissals_item_key_check;
alter table public.queue_dismissals
  add constraint queue_dismissals_item_key_check
  check (
    item_key ~ '^[a-z_]{2,24}:[0-9a-f-]{36}$'
    or item_key ~ '^trainer:[a-z_]{2,24}:[a-z0-9-]{2,40}$'
  );
