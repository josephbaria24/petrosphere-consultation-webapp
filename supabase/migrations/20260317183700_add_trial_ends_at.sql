-- 20260317183700_add_trial_ends_at.sql
-- Add trial_ends_at column to subscriptions for 14-day free trial tracking

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Set trial_ends_at for existing demo subscriptions that don't have it yet
-- (14 days from now, giving existing demo users a fresh trial)
UPDATE public.subscriptions
SET trial_ends_at = NOW() + INTERVAL '14 days',
    status = 'trialing'
WHERE plan = 'demo'
  AND status = 'active'
  AND trial_ends_at IS NULL;
