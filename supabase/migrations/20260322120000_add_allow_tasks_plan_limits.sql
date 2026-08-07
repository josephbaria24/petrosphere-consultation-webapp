-- Align plan gating with app bootstrap (allow_tasks for Field Work / inspections)

ALTER TABLE public.plan_limits
  ADD COLUMN IF NOT EXISTS allow_tasks boolean NOT NULL DEFAULT false;

ALTER TABLE public.org_limit_overrides
  ADD COLUMN IF NOT EXISTS allow_tasks boolean;

-- Professional / paid plans: enable field work by default
UPDATE public.plan_limits
SET allow_tasks = true
WHERE plan::text IN ('professional', 'paid');

-- Demo can stay false unless you want trials to include inspections
UPDATE public.plan_limits
SET allow_tasks = COALESCE(allow_tasks, false)
WHERE plan::text = 'demo';
