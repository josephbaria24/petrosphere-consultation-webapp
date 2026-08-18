-- Copy-only survey response migrations with restore history.
-- Source responses are never updated or deleted.

CREATE TABLE IF NOT EXISTS public.response_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_by_email text,
  source_org_id uuid,
  dest_org_id uuid,
  source_org_name text,
  dest_org_name text,
  source_survey_id uuid,
  dest_survey_id uuid,
  source_survey_title text,
  dest_survey_title text,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('running', 'completed', 'partial', 'failed', 'restored')),
  copied_count integer NOT NULL DEFAULT 0,
  skipped_conflict integer NOT NULL DEFAULT 0,
  skipped_unmatched integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  restored_at timestamptz,
  restored_by uuid,
  restored_by_email text,
  compare_summary jsonb,
  question_map jsonb,
  notes text
);

CREATE INDEX IF NOT EXISTS response_migrations_created_at_idx
  ON public.response_migrations (created_at DESC);

CREATE INDEX IF NOT EXISTS response_migrations_orgs_idx
  ON public.response_migrations (source_org_id, dest_org_id);

CREATE TABLE IF NOT EXISTS public.response_migration_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id uuid NOT NULL
    REFERENCES public.response_migrations(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT 'copied'
    CHECK (action IN ('copied', 'skipped_conflict', 'skipped_unmatched', 'failed')),
  source_response_id uuid,
  dest_response_id uuid,
  user_id uuid,
  source_question_id uuid,
  dest_question_id uuid,
  answer text,
  source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS response_migration_items_migration_idx
  ON public.response_migration_items (migration_id);

CREATE INDEX IF NOT EXISTS response_migration_items_dest_idx
  ON public.response_migration_items (dest_response_id)
  WHERE dest_response_id IS NOT NULL;

ALTER TABLE public.response_migrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_migration_items DISABLE ROW LEVEL SECURITY;
