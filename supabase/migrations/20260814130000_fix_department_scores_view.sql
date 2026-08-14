-- Ensure responses can store survey demographic department (mirrors role).
ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS department text;

-- Fix department scores view to use response.department fallback and users.department.
CREATE OR REPLACE VIEW public.v_org_scores_by_department AS
SELECT
    r.org_id,
    COALESCE(NULLIF(TRIM(r.department), ''), NULLIF(TRIM(u.department), '')) AS department,
    sq.survey_id,
    ROUND(AVG(
        CASE
            WHEN r.answer ~ '^\d+\.?\d*$' THEN r.answer::numeric
            ELSE NULL
        END
    ), 2) AS avg_score,
    COUNT(DISTINCT r.user_id) AS respondent_count
FROM public.responses r
JOIN public.users u ON r.user_id = u.id
JOIN public.survey_questions sq ON r.question_id = sq.id
WHERE COALESCE(NULLIF(TRIM(r.department), ''), NULLIF(TRIM(u.department), '')) IS NOT NULL
GROUP BY
    r.org_id,
    COALESCE(NULLIF(TRIM(r.department), ''), NULLIF(TRIM(u.department), '')),
    sq.survey_id;

GRANT SELECT ON public.v_org_scores_by_department TO authenticated;
