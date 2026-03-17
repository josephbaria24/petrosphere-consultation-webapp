-- 20260317164500_secure_tasks_module.sql
-- Enable RLS and add policies for the tasks module

-- 1. Enable RLS on all task tables
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_evidence ENABLE ROW LEVEL SECURITY;

-- 2. task_templates Policies
-- Anyone can see system templates (org_id IS NULL)
-- Members can see their organization's templates
CREATE POLICY "task_templates_select" ON public.task_templates
FOR SELECT TO authenticated
USING (org_id IS NULL OR EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.org_id = task_templates.org_id 
    AND memberships.user_id = auth.uid()
));

-- Only organization admins (or platform admins) can manage templates
-- Platform admins are identified by the absence of a profile or a specific flag (usually handled via JWT)
-- For now, we rely on the membership role.
CREATE POLICY "task_templates_manage" ON public.task_templates
FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.org_id = task_templates.org_id 
    AND memberships.user_id = auth.uid()
    AND memberships.role IN ('admin', 'owner')
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.org_id = task_templates.org_id 
    AND memberships.user_id = auth.uid()
    AND memberships.role IN ('admin', 'owner')
));

-- 3. checklist_templates & checklist_items Policies
-- Inherit access from task_templates
CREATE POLICY "checklist_templates_select" ON public.checklist_templates
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.task_templates
    WHERE task_templates.id = checklist_templates.task_template_id
));

CREATE POLICY "checklist_templates_manage" ON public.checklist_templates
FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.task_templates
    WHERE task_templates.id = checklist_templates.task_template_id
    AND EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE memberships.org_id = task_templates.org_id 
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('admin', 'owner')
    )
));

CREATE POLICY "checklist_items_select" ON public.checklist_items
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.checklist_templates
    WHERE checklist_templates.id = checklist_items.checklist_id
));

CREATE POLICY "checklist_items_manage" ON public.checklist_items
FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.checklist_templates
    JOIN public.task_templates ON task_templates.id = checklist_templates.task_template_id
    WHERE checklist_templates.id = checklist_items.checklist_id
    AND EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE memberships.org_id = task_templates.org_id 
        AND memberships.user_id = auth.uid()
        AND memberships.role IN ('admin', 'owner')
    )
));

-- 4. task_sessions Policies
-- Members can see sessions in their organization
-- Admins can see all, regular users only their own
CREATE POLICY "task_sessions_select" ON public.task_sessions
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.org_id = task_sessions.org_id 
    AND memberships.user_id = auth.uid()
    AND (memberships.role IN ('admin', 'owner') OR task_sessions.user_id = auth.uid())
));

-- Users can start sessions in their organization
CREATE POLICY "task_sessions_insert" ON public.task_sessions
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.org_id = org_id 
    AND memberships.user_id = auth.uid()
) AND user_id = auth.uid());

-- 5. task_responses & task_evidence Policies
-- Inherit from task_sessions
CREATE POLICY "task_responses_access" ON public.task_responses
FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.task_sessions
    WHERE task_sessions.id = session_id
));

CREATE POLICY "task_evidence_access" ON public.task_evidence
FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.task_responses
    JOIN public.task_sessions ON task_sessions.id = task_responses.session_id
    WHERE task_responses.id = response_id
));
