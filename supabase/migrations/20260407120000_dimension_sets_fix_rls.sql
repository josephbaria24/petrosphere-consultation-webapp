-- Fix: dimensions exist (75) but UI shows none because RLS blocks the anon key.
-- Run this now in Supabase SQL editor.

-- Allow read/write for both anon + authenticated (matches how this app queries via the browser client)
DROP POLICY IF EXISTS dimensions_select_authenticated ON public.dimensions;
DROP POLICY IF EXISTS dimensions_insert_authenticated ON public.dimensions;
DROP POLICY IF EXISTS dimensions_update_authenticated ON public.dimensions;
DROP POLICY IF EXISTS dimensions_delete_authenticated ON public.dimensions;

DROP POLICY IF EXISTS dimensions_select_all ON public.dimensions;
DROP POLICY IF EXISTS dimensions_insert_all ON public.dimensions;
DROP POLICY IF EXISTS dimensions_update_all ON public.dimensions;
DROP POLICY IF EXISTS dimensions_delete_all ON public.dimensions;

CREATE POLICY dimensions_select_all ON public.dimensions
  FOR SELECT USING (true);

CREATE POLICY dimensions_insert_all ON public.dimensions
  FOR INSERT WITH CHECK (true);

CREATE POLICY dimensions_update_all ON public.dimensions
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY dimensions_delete_all ON public.dimensions
  FOR DELETE USING (true);

-- Same for dimension_sets
DROP POLICY IF EXISTS dimension_sets_select ON public.dimension_sets;
DROP POLICY IF EXISTS dimension_sets_insert ON public.dimension_sets;
DROP POLICY IF EXISTS dimension_sets_update ON public.dimension_sets;
DROP POLICY IF EXISTS dimension_sets_delete ON public.dimension_sets;

DROP POLICY IF EXISTS dimension_sets_select_all ON public.dimension_sets;
DROP POLICY IF EXISTS dimension_sets_insert_all ON public.dimension_sets;
DROP POLICY IF EXISTS dimension_sets_update_all ON public.dimension_sets;
DROP POLICY IF EXISTS dimension_sets_delete_all ON public.dimension_sets;

CREATE POLICY dimension_sets_select_all ON public.dimension_sets
  FOR SELECT USING (true);

CREATE POLICY dimension_sets_insert_all ON public.dimension_sets
  FOR INSERT WITH CHECK (true);

CREATE POLICY dimension_sets_update_all ON public.dimension_sets
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY dimension_sets_delete_all ON public.dimension_sets
  FOR DELETE USING (true);

-- Quick check: which set has the rows?
SELECT s.name, COUNT(d.id) AS dimension_count
FROM public.dimension_sets s
LEFT JOIN public.dimensions d ON d.set_id = s.id
GROUP BY s.name
ORDER BY dimension_count DESC;
