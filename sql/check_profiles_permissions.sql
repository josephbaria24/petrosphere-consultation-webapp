-- Check table permissions for profiles
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'profiles';

-- Check if the service role has the necessary permissions
SELECT * FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND grantee IN ('service_role', 'authenticated', 'anon', 'postgres');

-- Grant all permissions to service_role if missing
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO authenticated;

-- Also check if there are any triggers that might be interfering
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'profiles';
