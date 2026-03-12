-- Add organization-scoped analytics views

-- 1) v_org_response_rate
-- Scoped by org_id and survey_id
-- Calculates total unique participants against total organization members
CREATE OR REPLACE VIEW public.v_org_response_rate AS
WITH survey_participants AS (
    SELECT 
        r.org_id,
        sq.survey_id,
        COUNT(DISTINCT r.user_id) as total_responses
    FROM public.responses r
    JOIN public.survey_questions sq ON r.question_id = sq.id
    GROUP BY r.org_id, sq.survey_id
),
org_members AS (
    SELECT 
        org_id,
        COUNT(DISTINCT user_id) as total_invited
    FROM public.memberships
    GROUP BY org_id
)
SELECT 
    s.org_id,
    s.id as survey_id,
    COALESCE(om.total_invited, 0) as total_invited,
    COALESCE(sp.total_responses, 0) as total_responses,
    CASE 
        WHEN COALESCE(om.total_invited, 0) > 0 
        THEN ROUND((COALESCE(sp.total_responses, 0)::numeric / om.total_invited::numeric) * 100, 2)
        ELSE 0 
    END as response_rate
FROM public.surveys s
LEFT JOIN survey_participants sp ON s.id = sp.survey_id
LEFT JOIN org_members om ON s.org_id = om.org_id;

-- 2) v_org_action_overdue
-- Scoped by org_id
-- Actions where target_date passed and not completed
CREATE OR REPLACE VIEW public.v_org_action_overdue AS
SELECT 
    org_id,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE target_date < CURRENT_DATE AND is_completed = false) as overdue_actions,
    CASE 
        WHEN COUNT(*) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE target_date < CURRENT_DATE AND is_completed = false)::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0 
    END as overdue_pct
FROM public.actions
GROUP BY org_id;

-- 3) v_org_action_closure_time
-- Scoped by org_id
-- Average days taken to close an action (updated_at - created_at)
CREATE OR REPLACE VIEW public.v_org_action_closure_time AS
SELECT 
    org_id,
    ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::numeric, 2) as avg_days_to_close
FROM public.actions
WHERE is_completed = true
GROUP BY org_id;

-- 4) v_org_safety_score_monthly
-- Scoped by org_id
-- Monthly trend of average safety score from responses
CREATE OR REPLACE VIEW public.v_org_safety_score_monthly AS
SELECT 
    org_id,
    DATE_TRUNC('month', created_at) as month,
    ROUND(AVG(NULLIF(regexp_replace(answer, '[^0-9.]', '', 'g'), '')::numeric), 2) as safety_score,
    COUNT(DISTINCT user_id) as total_responses
FROM public.responses
GROUP BY org_id, month;

-- Grant access to authenticated users (adjust as needed for specific roles)
GRANT SELECT ON public.v_org_response_rate TO authenticated;
GRANT SELECT ON public.v_org_action_overdue TO authenticated;
GRANT SELECT ON public.v_org_action_closure_time TO authenticated;
GRANT SELECT ON public.v_org_safety_score_monthly TO authenticated;
