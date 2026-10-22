-- Run this AFTER you have signed in once (you become admin). It hands your old test jobs to you.
update public.jobs
set user_id = (select id from public.profiles where role = 'admin' order by created_at limit 1)
where user_id is null;
