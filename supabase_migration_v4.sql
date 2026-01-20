
-- Create hotel_price_drop_events table
-- Create hotel_price_drop_events table
create table if not exists public.hotel_price_drop_events (
  id uuid default gen_random_uuid() primary key,
  hotel_id text not null,
  previous_price numeric not null,
  new_price numeric not null,
  drop_percent numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.hotel_price_drop_events enable row level security;

-- Allow public insert (price tracking runs on client)
create policy "Allow public insert"
  on public.hotel_price_drop_events
  for insert
  with check (true);
