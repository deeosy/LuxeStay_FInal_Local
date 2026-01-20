
-- Allow authenticated users to read their own price alerts
create policy "Allow users to read own alerts"
  on public.user_price_alert_queue
  for select
  to authenticated
  using (auth.uid()::text = user_id);
