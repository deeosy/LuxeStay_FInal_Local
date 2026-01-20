-- Create Admin View
create or replace view price_alert_job_runs_admin_view as
select
  id,
  started_at,
  finished_at,
  status,
  processed_count,
  success_count,
  failure_count,
  dead_count,
  error_message
from price_alert_job_runs
order by started_at desc;

-- Security:
-- The underlying table 'price_alert_job_runs' has RLS enabled and no public policies.
-- By default, this view runs with the privileges of the owner (postgres).
-- However, we are NOT granting SELECT permission to 'anon' or 'authenticated' roles.
-- This ensures that only the Service Role (which bypasses RLS/permissions) can access this view.
-- Access control for 'admins' is enforced at the Edge Function layer, which uses the Service Role client
-- after verifying the user's role.

-- Explicitly revoke public access just in case
revoke all on price_alert_job_runs_admin_view from anon, authenticated;
grant select on price_alert_job_runs_admin_view to service_role;
