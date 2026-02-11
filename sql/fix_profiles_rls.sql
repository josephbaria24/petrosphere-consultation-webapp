-- Check if RLS is enabled on profiles table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Check existing policies on profiles table
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- If RLS is enabled, you need to either:
-- Option 1: Disable RLS (not recommended for production)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Option 2: Add a policy to allow service role to insert/update (recommended)
CREATE POLICY "Service role can manage profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Option 3: Add a policy for authenticated users to manage their own profile
CREATE POLICY "Users can manage own profile"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
