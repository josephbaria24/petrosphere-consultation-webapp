-- Find which set holds your 75 dimensions
SELECT
  s.id,
  s.name,
  s.org_id,
  s.created_at,
  COUNT(d.id) AS dimension_count
FROM public.dimension_sets s
LEFT JOIN public.dimensions d ON d.set_id = s.id
GROUP BY s.id, s.name, s.org_id, s.created_at
ORDER BY dimension_count DESC, s.created_at;

-- Any dimensions pointing at a missing set?
SELECT COUNT(*) AS orphaned
FROM public.dimensions d
LEFT JOIN public.dimension_sets s ON s.id = d.set_id
WHERE s.id IS NULL;
