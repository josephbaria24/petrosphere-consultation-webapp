-- Migration to add image_url to task_templates and seed existing templates
ALTER TABLE public.task_templates ADD COLUMN IF NOT EXISTS image_url text;

-- Update existing system templates with icons provided by user
UPDATE public.task_templates 
SET image_url = '/icons/inspect.svg' 
WHERE title ILIKE '%Scheduled Inspection%' AND org_id IS NULL;

UPDATE public.task_templates 
SET image_url = '/icons/safety.svg' 
WHERE title ILIKE '%Safety Walk%' AND org_id IS NULL;
