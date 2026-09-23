-- Scheduled housekeeping (BR-L7 seat holds, waitlist invites) and trigram search for discovery (TRN-DSC-01).

create extension if not exists pg_cron;
create extension if not exists pg_trgm with schema extensions;

select cron.schedule('expire-stale-holds', '* * * * *', $$select public.expire_stale_holds()$$);

create index courses_title_trgm on public.courses using gin (title extensions.gin_trgm_ops);
create index programs_title_trgm on public.programs using gin (title extensions.gin_trgm_ops);
