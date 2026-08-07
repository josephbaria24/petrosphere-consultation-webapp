-- Temporarily disable RLS on dimension tables (app uses anon key from the browser)
ALTER TABLE public.dimensions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimension_sets DISABLE ROW LEVEL SECURITY;
