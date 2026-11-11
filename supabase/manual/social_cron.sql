-- Every 5 minutes: let Benchmrk publish due social posts (server/social/publish.ts).
-- Run this once in the Supabase SQL Editor AFTER migration 024, with <SOCIAL_CRON_SECRET> replaced by the value of the
-- Vercel env var SOCIAL_CRON_SECRET. Not a migration: it holds a secret and must not be committed with the real value.
-- Works on the free Vercel plan (Vercel Cron only runs once a day there).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('benchmrk-social-publish') where exists (select 1 from cron.job where jobname = 'benchmrk-social-publish');
select cron.schedule(
  'benchmrk-social-publish',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://app.benchmrk.ai/api/social/publish',
    headers := jsonb_build_object('Authorization', 'Bearer <SOCIAL_CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- check: select * from cron.job; select * from cron.job_run_details order by start_time desc limit 10;
-- stop:  select cron.unschedule('benchmrk-social-publish');
