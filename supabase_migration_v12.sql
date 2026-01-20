
-- Create enum for frequency
do $$ begin
    create type public.price_alert_frequency_type as enum ('instant', 'daily', 'weekly');
exception
    when duplicate_object then null;
end $$;

-- Add column to user_notification_settings
alter table public.user_notification_settings
add column if not exists price_alert_frequency public.price_alert_frequency_type default 'instant';

-- Add columns to user_price_alert_queue
alter table public.user_price_alert_queue
add column if not exists digest_group text,
add column if not exists scheduled_for timestamp with time zone default now();

-- Create index for performance
create index if not exists idx_user_price_alert_queue_scheduled 
on public.user_price_alert_queue (scheduled_for);
