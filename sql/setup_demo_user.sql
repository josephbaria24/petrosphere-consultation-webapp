-- ============================================
-- SETUP SCRIPT FOR DEMO USER
-- ============================================
-- This script creates the necessary database records for a demo user
-- Run this AFTER the user has signed in via magic link for the first time

-- Step 1: Find the user's auth ID
-- After logging in via magic link, the user will be in auth.users table
-- You can find their ID by running:
-- SELECT id, email FROM auth.users WHERE email = 'demo@example.com';

-- Step 2: Create a demo organization
INSERT INTO organizations (id, name, created_at)
VALUES (
  gen_random_uuid(), -- This will be your org_id
  'Demo Company', -- Change this to the company name
  timezone('utc'::text, now())
)
RETURNING id; -- Save this ID for the next steps

-- Step 3: Link the user to the organization
-- Replace 'YOUR_ORG_ID' with the ID from step 2
-- Replace 'YOUR_USER_AUTH_ID' with the ID from step 1
INSERT INTO memberships (id, org_id, user_id, role, created_at)
VALUES (
  gen_random_uuid(),
  'YOUR_ORG_ID', -- From step 2
  'YOUR_USER_AUTH_ID', -- From step 1 (auth.users.id)
  'demo', -- Role: 'demo', 'member', or 'admin'
  timezone('utc'::text, now())
);

-- Step 4: Create subscription with demo plan
-- Replace 'YOUR_ORG_ID' with the ID from step 2
INSERT INTO subscriptions (org_id, plan, status, created_at, updated_at, demo_mode)
VALUES (
  'YOUR_ORG_ID', -- From step 2
  'demo', -- Plan: 'demo' or 'paid'
  'active', -- Status
  timezone('utc'::text, now()),
  timezone('utc'::text, now()),
  'real' -- 'sample' or 'real'
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if everything is set up correctly:

-- 1. Check organizations
SELECT * FROM organizations WHERE name = 'Demo Company';

-- 2. Check memberships
SELECT m.*, o.name as org_name, u.email
FROM memberships m
JOIN organizations o ON m.org_id = o.id
JOIN auth.users u ON m.user_id = u.id
WHERE o.name = 'Demo Company';

-- 3. Check subscriptions
SELECT s.*, o.name as org_name
FROM subscriptions s
JOIN organizations o ON s.org_id = o.id
WHERE o.name = 'Demo Company';

-- 4. Check plan limits (should already exist)
SELECT * FROM plan_limits WHERE plan = 'demo';
