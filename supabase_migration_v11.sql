-- Update user_price_alert_queue status check to include 'skipped'
alter table public.user_price_alert_queue
drop constraint if exists user_price_alert_queue_status_check;

alter table public.user_price_alert_queue
add constraint user_price_alert_queue_status_check
check (status in ('pending', 'sent', 'failed', 'dead', 'skipped'));

-- Add skipped_count to price_alert_job_runs
alter table public.price_alert_job_runs
add column if not exists skipped_count integer default 0;
