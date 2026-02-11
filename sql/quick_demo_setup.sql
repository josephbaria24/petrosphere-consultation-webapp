-- ============================================
-- QUICK SETUP FOR SPECIFIC DEMO USER
-- ============================================
-- Use this script when you know the user's email
-- Replace 'your-demo-email@example.com' with the actual email

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'your-demo-email@example.com'; -- CHANGE THIS
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Make sure they have logged in via magic link first.';
  END IF;

  -- Create organization
  INSERT INTO organizations (name)
  VALUES ('Demo Company') -- CHANGE THIS
  RETURNING id INTO v_org_id;

  -- Create membership
  INSERT INTO memberships (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'demo');

  -- Create subscription
  INSERT INTO subscriptions (org_id, plan, status, demo_mode)
  VALUES (v_org_id, 'demo', 'active', 'real');

  RAISE NOTICE 'Demo user setup complete!';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Org ID: %', v_org_id;
END $$;
