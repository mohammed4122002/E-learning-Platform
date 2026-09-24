-- TRR-PRF-02 «قوة ملفك»: the intro video is one of the eight profile elements. Additive column.
alter table public.trainer_profiles add column if not exists intro_video_url text
  check (intro_video_url is null or (intro_video_url ~ '^https://' and char_length(intro_video_url) <= 300));
