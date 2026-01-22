create table if not exists public.email_unsubscribe_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  action text not null,
  source text not null default 'email_link',
  created_at timestamp with time zone default now()
);

alter table public.email_unsubscribe_events enable row level security;

create policy "Service role can insert unsubscribe events"
  on public.email_unsubscribe_events
  for insert
  to service_role
  with check (true);

create policy "Service role can select unsubscribe events"
  on public.email_unsubscribe_events
  for select
  to service_role
  using (true);
