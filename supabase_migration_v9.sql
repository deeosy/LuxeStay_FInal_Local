-- Create price_alert_job_runs table
create table if not exists price_alert_job_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  processed_count integer default 0,
  success_count integer default 0,
  failure_count integer default 0,
  dead_count integer default 0,
  error_message text
);

-- Enable RLS
alter table price_alert_job_runs enable row level security;

create index on price_alert_job_runs (started_at desc);


-- Create policy for Service Role only (implicit bypass, but good for documentation/explicit deny for others)
-- Actually, enabling RLS without adding any policies denies all public access by default.
-- Service role bypasses RLS automatically.
-- So we just need to enable RLS.
