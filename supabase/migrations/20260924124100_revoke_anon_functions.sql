-- Supabase grants EXECUTE on new public functions to anon by default. These two are not meant for signed-out
-- visitors: profile_view_count needs a user, and notify_course_file_published is a trigger function.
revoke execute on function public.profile_view_count() from anon;
revoke execute on function public.notify_course_file_published() from anon, authenticated, public;
