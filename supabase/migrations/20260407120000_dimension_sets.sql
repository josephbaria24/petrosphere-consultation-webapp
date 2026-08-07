-- Dimension sets: group dimensions into reusable collections
-- Fixes: drop FKs that depend on dimensions_pkey (e.g. survey_questions.dimension_code)
-- before changing the primary key from code → id.

CREATE TABLE IF NOT EXISTS public.dimension_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dimension_sets_org_id_idx
  ON public.dimension_sets (org_id);

-- Attach dimensions to a set (RESTRICT: deleting a set won't silently wipe dimensions)
ALTER TABLE public.dimensions
  ADD COLUMN IF NOT EXISTS set_id uuid;

-- Ensure FK is RESTRICT even if an earlier partial run created CASCADE
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT c.conname INTO fk_name
  FROM pg_constraint c
  JOIN pg_class rel ON rel.oid = c.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE c.contype = 'f'
    AND nsp.nspname = 'public'
    AND rel.relname = 'dimensions'
    AND pg_get_constraintdef(c.oid) ILIKE '%dimension_sets%';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.dimensions DROP CONSTRAINT %I', fk_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE c.contype = 'f'
      AND nsp.nspname = 'public'
      AND rel.relname = 'dimensions'
      AND pg_get_constraintdef(c.oid) ILIKE '%dimension_sets%'
  ) THEN
    ALTER TABLE public.dimensions
      ADD CONSTRAINT dimensions_set_id_fkey
      FOREIGN KEY (set_id) REFERENCES public.dimension_sets(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE public.dimensions
  ADD COLUMN IF NOT EXISTS id uuid;

UPDATE public.dimensions
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.dimensions
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.dimensions
  ALTER COLUMN id SET NOT NULL;

-- Drop foreign keys that reference dimensions(code) / dimensions_pkey
-- (survey_questions stores dimension_code as text; codes can repeat across sets,
-- so a hard FK on code alone is no longer valid.)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      c.conrelid::regclass AS table_name,
      c.conname AS constraint_name
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.confrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE c.contype = 'f'
      AND nsp.nspname = 'public'
      AND rel.relname = 'dimensions'
  LOOP
    EXECUTE format(
      'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
      r.table_name,
      r.constraint_name
    );
  END LOOP;
END $$;

-- Move primary key from code → id when needed (code stays unique per set)
DO $$
DECLARE
  pk_name text;
  pk_cols text;
BEGIN
  SELECT tc.constraint_name,
         string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position)
    INTO pk_name, pk_cols
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'dimensions'
    AND tc.constraint_type = 'PRIMARY KEY'
  GROUP BY tc.constraint_name;

  IF pk_name IS NOT NULL AND pk_cols IS DISTINCT FROM 'id' THEN
    EXECUTE format('ALTER TABLE public.dimensions DROP CONSTRAINT %I', pk_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'dimensions'
      AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.dimensions ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Keep code searchable/unique within a set; also keep a non-unique index on code
-- for lookups used by scoring / survey_questions.dimension_code
CREATE INDEX IF NOT EXISTS dimensions_code_idx
  ON public.dimensions (code);

-- Backfill a default set for any orphaned dimensions
DO $$
DECLARE
  default_set_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.dimensions WHERE set_id IS NULL) THEN
    SELECT id INTO default_set_id
    FROM public.dimension_sets
    WHERE name = 'Default'
    ORDER BY created_at
    LIMIT 1;

    IF default_set_id IS NULL THEN
      INSERT INTO public.dimension_sets (name, description)
      VALUES ('Default', 'Migrated existing dimensions')
      RETURNING id INTO default_set_id;
    END IF;

    UPDATE public.dimensions
    SET set_id = default_set_id
    WHERE set_id IS NULL;
  END IF;

  -- Ensure at least one set exists for empty databases
  IF NOT EXISTS (SELECT 1 FROM public.dimension_sets) THEN
    INSERT INTO public.dimension_sets (name, description)
    VALUES ('Default', 'Starter dimension set');
  END IF;
END $$;

-- Prefer non-null set_id going forward
ALTER TABLE public.dimensions
  ALTER COLUMN set_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS dimensions_set_id_code_uidx
  ON public.dimensions (set_id, code);

CREATE INDEX IF NOT EXISTS dimensions_set_id_idx
  ON public.dimensions (set_id);

-- Keep RLS off for now: this app reads/writes dimensions via the browser anon key.
-- Re-enable with proper policies later if needed.
ALTER TABLE public.dimension_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimensions DISABLE ROW LEVEL SECURITY;
