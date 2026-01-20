
-- Create user_email_send_log table for rate limiting
create table if not exists public.user_email_send_log (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    sent_date date not null,
    count integer default 1,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique (user_id, sent_date)
);

-- Enable RLS
alter table public.user_email_send_log enable row level security;

-- Only Service Role can manage this table (internal logic)
create policy "Service Role Full Access"
    on public.user_email_send_log
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

-- Index for lookups
create index if not exists idx_user_email_send_log_lookup 
    on public.user_email_send_log (user_id, sent_date);
