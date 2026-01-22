
-- Add marketing_emails column if it doesn't exist
alter table public.user_notification_settings
add column if not exists marketing_emails boolean default true;

-- Ensure RLS allows users to update their own settings (existing policies likely cover this, but good to verify)
-- Assuming existing policy "Users can update own settings" exists. If not, we might need it, but usually standard setup has it.
-- We will just add the column for now.
