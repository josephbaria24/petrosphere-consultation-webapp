-- Classify task templates by field workflow (scheduled inspection, safety walk, audit)

ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS template_kind text NOT NULL DEFAULT 'scheduled_inspection';

ALTER TABLE public.task_templates
  DROP CONSTRAINT IF EXISTS task_templates_template_kind_check;

ALTER TABLE public.task_templates
  ADD CONSTRAINT task_templates_template_kind_check
  CHECK (template_kind IN ('scheduled_inspection', 'safety_walk', 'audit'));

UPDATE public.task_templates
SET template_kind = 'scheduled_inspection'
WHERE title ILIKE '%Scheduled Inspection%';

UPDATE public.task_templates
SET template_kind = 'safety_walk'
WHERE title ILIKE '%Safety Walk%';

-- Seed a global audit template when none exists
DO $$
DECLARE
  v_audit_template uuid;
  v_audit_checklist uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.task_templates
    WHERE template_kind = 'audit' AND org_id IS NULL
  ) THEN
    v_audit_template := gen_random_uuid();
    v_audit_checklist := gen_random_uuid();

    INSERT INTO public.task_templates (id, title, description, icon, template_kind)
    VALUES (
      v_audit_template,
      'Compliance Audit',
      'Formal audit checklist for compliance and safety review.',
      'ShieldCheck',
      'audit'
    );

    INSERT INTO public.checklist_templates (id, task_template_id, title, description)
    VALUES (
      v_audit_checklist,
      v_audit_template,
      'Standard Compliance Audit',
      'Core audit questions for workplace safety compliance.'
    );

    INSERT INTO public.checklist_items (checklist_id, text, order_index, requires_media_on_no)
    VALUES
      (v_audit_checklist, 'Are safety policies documented and accessible to all staff?', 1, true),
      (v_audit_checklist, 'Is incident reporting documented and followed within required timelines?', 2, true),
      (v_audit_checklist, 'Are training records current for all personnel in high-risk roles?', 3, true),
      (v_audit_checklist, 'Are corrective actions from prior audits tracked to closure?', 4, true);
  END IF;
END $$;
