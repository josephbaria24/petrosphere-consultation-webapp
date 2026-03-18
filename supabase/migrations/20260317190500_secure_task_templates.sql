-- 20260317190500_secure_task_templates.sql
-- Add created_by column to task_templates for user-level isolation and restricted deletion

ALTER TABLE public.task_templates
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Backfill created_by for templates that have an org_id
-- We can't know for sure who created existing ones, but we can assign them 
-- to the current user if we were in a session. 
-- For existing data, we'll leave them as NULL or assign them to a placeholder if needed.
-- But usually, we only care about new ones.
