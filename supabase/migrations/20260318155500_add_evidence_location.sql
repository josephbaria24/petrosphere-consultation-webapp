-- Add GPS coordinates to task_evidence for location pinning
ALTER TABLE public.task_evidence
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;
