
-- Create user_price_alert_queue table
create table if not exists public.user_price_alert_queue (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  hotel_id text not null,
  previous_price numeric not null,
  new_price numeric not null,
  drop_percent numeric,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create unique index to prevent duplicate alerts for the same price drop
create unique index if not exists idx_user_price_alert_queue_unique 
  on public.user_price_alert_queue (user_id, hotel_id, new_price);

-- Enable RLS
alter table public.user_price_alert_queue enable row level security;

-- Allow public insert (client-side enqueue)
create policy "Allow public insert"
  on public.user_price_alert_queue
  for insert
  with check (true);

-- No public select/update/delete policies defined (implicit deny)


alter table public.user_price_alert_queue
add constraint user_price_alert_queue_status_check
check (status in ('pending', 'sent', 'failed'));

