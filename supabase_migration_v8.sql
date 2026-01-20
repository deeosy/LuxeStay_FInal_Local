-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the job to run every 10 minutes
-- Note: Replace 'https://project-ref.supabase.co/functions/v1/process-price-alerts' with your actual function URL
-- Note: Replace 'SERVICE_ROLE_KEY' with your actual Supabase service role key
select cron.schedule(
  'process-price-alerts',
  '*/10 * * * *',
  $$
  select
    net.http_post(
        url:='https://cyopwkfinqpsnnpqmmkb.supabase.co/functions/v1/process-price-alerts',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
