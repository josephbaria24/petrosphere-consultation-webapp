-- Migration: Add granular limit columns to plan_limits and org_limit_overrides

-- 1. Update plan_limits (Base limits for each plan tier)
ALTER TABLE public.plan_limits 
ADD COLUMN IF NOT EXISTS allow_chat_ai boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_ai_insights boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_individual_responses boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_dimensions boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_respondents boolean NOT NULL DEFAULT false;

-- 2. Update org_limit_overrides (Individual organization overrides)
ALTER TABLE public.org_limit_overrides 
ADD COLUMN IF NOT EXISTS allow_chat_ai boolean,
ADD COLUMN IF NOT EXISTS allow_ai_insights boolean,
ADD COLUMN IF NOT EXISTS allow_individual_responses boolean,
ADD COLUMN IF NOT EXISTS allow_dimensions boolean,
ADD COLUMN IF NOT EXISTS allow_respondents boolean;

-- 3. (Optional) Initialize Premium plan with these features enabled
UPDATE public.plan_limits 
SET allow_chat_ai = true, 
    allow_ai_insights = true, 
    allow_individual_responses = true,
    allow_dimensions = true,
    allow_respondents = true
WHERE plan = 'paid';
