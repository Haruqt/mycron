-- Run this AFTER you deploy to Vercel (Supabase → SQL Editor).
-- It makes Supabase ping your app every minute so due jobs get executed.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'mycron-tick',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://mycron-andrei.vercel.app/api/tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_CRON_SECRET'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Handy extras:
-- see the pings:   select * from cron.job_run_details order by start_time desc limit 10;
-- stop the pings:  select cron.unschedule('mycron-tick');
