-- Consultant question banks: reusable instrument sets per organization
CREATE TABLE IF NOT EXISTS public.consultant_question_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  company_label text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultant_question_banks_org_id_idx
  ON public.consultant_question_banks (org_id);

CREATE INDEX IF NOT EXISTS consultant_question_banks_updated_at_idx
  ON public.consultant_question_banks (updated_at DESC);

ALTER TABLE public.consultant_question_banks DISABLE ROW LEVEL SECURITY;
