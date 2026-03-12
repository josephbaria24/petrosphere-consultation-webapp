-- Reset cover images for system templates
UPDATE public.task_templates 
SET image_url = NULL 
WHERE org_id IS NULL;
