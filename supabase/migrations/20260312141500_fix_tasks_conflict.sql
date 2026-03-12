
-- 1. Ensure the Global Organization exists for admins
INSERT INTO public.organizations (id, name)
VALUES ('939f6864-0f36-4740-9509-a654b453c9d9', 'Safety Vitals Global')
ON CONFLICT (id) DO NOTHING;

-- 2. Relax user_id constraint to allow Platform Admins (who are not in profiles/users table)
ALTER TABLE public.task_sessions DROP CONSTRAINT IF EXISTS task_sessions_user_id_fkey;

-- 3. Ensure tables are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_evidence TO authenticated;
