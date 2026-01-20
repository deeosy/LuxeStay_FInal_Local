
-- Add retry columns to user_price_alert_queue
alter table public.user_price_alert_queue
add column if not exists retry_count int default 0,
add column if not exists last_attempt_at timestamp with time zone;

-- Update status check constraint to include 'dead'
alter table public.user_price_alert_queue
drop constraint if exists user_price_alert_queue_status_check;

alter table public.user_price_alert_queue
add constraint user_price_alert_queue_status_check
check (status in ('pending', 'sent', 'failed', 'dead'));
