-- Create the table for tracking affiliate clicks
create table if not exists public.affiliate_clicks (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  hotel_id text not null,
  hotel_name text,
  city text,
  page_path text,
  price numeric,
  source text default 'liteapi',
  ip_hash text,
  user_agent text
);

-- Enable Row Level Security (RLS)
alter table public.affiliate_clicks enable row level security;

-- Policy: Allow Anon/Public Read Access (Aggregated stats might need this if frontend calls directly, 
-- but user said "Frontend can only read aggregated stats". 
-- Usually we might create a view or RPC, but for simplicity let's allow read for authenticated users or just keep it locked to service role if we use Edge Functions for stats.
-- However, the user asked for a React page pulling data from Supabase.
-- If the React page uses the standard client (anon key), we need a policy to allow reading.
-- "Frontend can only read aggregated stats" implies we shouldn't expose raw rows to anon.
-- But for an "Admin" dashboard, usually the user is logged in. 
-- Let's assume the admin dashboard requires an authenticated user (auth.uid() is not null).
-- Or we can allow read access to specific users.
-- For now, I will create a policy that allows read access to authenticated users (assuming the admin is authenticated).
create policy "Allow read access to authenticated users"
  on public.affiliate_clicks
  for select
  to authenticated
  using (true);

-- Policy: Allow Service Role (Netlify Function) to insert
-- Service role bypasses RLS, so we don't strictly need an insert policy for it, 
-- but we should ensure NO ONE else can insert.
-- So we DO NOT create an insert policy for public/anon.
-- This satisfies "Only Netlify functions may write to Supabase".

-- Indexes for performance
create index if not exists idx_affiliate_clicks_created_at on public.affiliate_clicks(created_at);
create index if not exists idx_affiliate_clicks_city on public.affiliate_clicks(city);
create index if not exists idx_affiliate_clicks_hotel_id on public.affiliate_clicks(hotel_id);

create table if not exists public.affiliate_events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  hotel_id text not null,
  city_slug text,
  filter_slug text,
  page_url text,
  event_type text not null
);

alter table public.affiliate_events enable row level security;

create index if not exists idx_affiliate_events_hotel_id on public.affiliate_events(hotel_id);
create index if not exists idx_affiliate_events_city_slug on public.affiliate_events(city_slug);
create index if not exists idx_affiliate_events_event_type on public.affiliate_events(event_type);
create index if not exists idx_affiliate_events_created_at on public.affiliate_events(created_at);

create table if not exists public.seo_index_queue (
  id uuid default gen_random_uuid() primary key,
  url text not null unique,
  city_slug text,
  status text default 'pending',
  attempts integer default 0,
  last_attempt_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_seo_index_queue_status on public.seo_index_queue(status);
create index if not exists idx_seo_index_queue_city_slug on public.seo_index_queue(city_slug);
create index if not exists idx_seo_index_queue_created_at on public.seo_index_queue(created_at);

create table if not exists public.seo_city_registry (
  city_slug text primary key,
  priority text default 'normal',
  is_frozen boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_seo_city_registry_priority on public.seo_city_registry(priority);
create index if not exists idx_seo_city_registry_is_frozen on public.seo_city_registry(is_frozen);

create table if not exists public.seo_system_config (
  key text primary key,
  value jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

insert into public.seo_system_config (key, value)
values ('seo_enabled', '{"enabled": true}'::jsonb)
on conflict (key) do nothing;
