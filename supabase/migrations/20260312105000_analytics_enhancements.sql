-- Add department breakdown and owner performance views

-- 1) v_org_scores_by_department
-- Department-level safety score breakdown per survey
CREATE OR REPLACE VIEW public.v_org_scores_by_department AS
SELECT 
    r.org_id,
    u.department,
    sq.survey_id,
    ROUND(AVG(
        CASE 
            WHEN r.answer ~ '^\d+\.?\d*$' THEN r.answer::numeric
            ELSE NULL
        END
    ), 2) as avg_score,
    COUNT(DISTINCT r.user_id) as respondent_count
FROM public.responses r
JOIN public.users u ON r.user_id = u.id
JOIN public.survey_questions sq ON r.question_id = sq.id
WHERE u.department IS NOT NULL AND u.department != ''
GROUP BY r.org_id, u.department, sq.survey_id;

-- 2) v_org_actions_by_owner
-- Action accountability metrics grouped by assigned owner
CREATE OR REPLACE VIEW public.v_org_actions_by_owner AS
SELECT 
    org_id,
    COALESCE(NULLIF(assigned_to, ''), 'Unassigned') as owner,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_completed = false) as open,
    COUNT(*) FILTER (WHERE target_date < CURRENT_DATE AND is_completed = false) as overdue,
    COUNT(*) FILTER (WHERE is_completed = true) as closed
FROM public.actions
GROUP BY org_id, COALESCE(NULLIF(assigned_to, ''), 'Unassigned');

-- Grant access
GRANT SELECT ON public.v_org_scores_by_department TO authenticated;
GRANT SELECT ON public.v_org_actions_by_owner TO authenticated;
