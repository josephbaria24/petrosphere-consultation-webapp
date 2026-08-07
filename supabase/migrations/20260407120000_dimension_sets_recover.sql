-- Diagnose + recover dimensions after dimension_sets migration
-- Run this in Supabase SQL editor

-- 1) Do dimensions still exist?
SELECT COUNT(*) AS dimensions_count FROM public.dimensions;

-- 2) Sets and how many dimensions each has
SELECT
  s.id,
  s.name,
  s.org_id,
  s.created_at,
  COUNT(d.id) AS dimension_count
FROM public.dimension_sets s
LEFT JOIN public.dimensions d ON d.set_id = s.id
GROUP BY s.id, s.name, s.org_id, s.created_at
ORDER BY s.created_at;

-- 3) Any dimensions with missing/invalid set_id?
SELECT id, code, dimension_name, set_id
FROM public.dimensions
WHERE set_id IS NULL
   OR set_id NOT IN (SELECT id FROM public.dimension_sets);

-- ============================================================
-- RECOVERY (only if dimensions_count = 0)
-- Rebuild Default set from distinct codes already on survey_questions
-- ============================================================

DO $$
DECLARE
  default_set_id uuid;
  restored_count integer;
BEGIN
  -- Only restore when the table is empty
  IF EXISTS (SELECT 1 FROM public.dimensions LIMIT 1) THEN
    RAISE NOTICE 'dimensions table is not empty — skipping restore from survey_questions';
    RETURN;
  END IF;

  SELECT id INTO default_set_id
  FROM public.dimension_sets
  WHERE name = 'Default'
  ORDER BY created_at
  LIMIT 1;

  IF default_set_id IS NULL THEN
    INSERT INTO public.dimension_sets (name, description)
    VALUES ('Default', 'Restored from survey_questions')
    RETURNING id INTO default_set_id;
  END IF;

  INSERT INTO public.dimensions (code, dimension_name, description, set_id)
  SELECT DISTINCT ON (sq.dimension_code)
    sq.dimension_code,
    COALESCE(NULLIF(TRIM(sq.dimension), ''), sq.dimension_code),
    'Restored from existing survey questions',
    default_set_id
  FROM public.survey_questions sq
  WHERE sq.dimension_code IS NOT NULL
    AND TRIM(sq.dimension_code) <> ''
  ORDER BY sq.dimension_code, sq.created_at DESC NULLS LAST;

  GET DIAGNOSTICS restored_count = ROW_COUNT;
  RAISE NOTICE 'Restored % dimensions into set %', restored_count, default_set_id;
END $$;

-- 4) Verify after recovery
SELECT code, dimension_name, set_id
FROM public.dimensions
ORDER BY code;
