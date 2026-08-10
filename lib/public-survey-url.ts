/**
 * Public survey URL helpers — always rebuild from current origin / site URL
 * so links never stick to localhost after deploy.
 */

export function getPublicAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://safetyvitals.petros-global.com";
}

/**
 * Prefer UUID path for take-survey links.
 * Slugs can collide or fail lookup; UUID is stable after create.
 */
export function surveyPathId(surveyId: string, _slug?: string | null): string {
  return surveyId;
}

export function buildPublicSurveyUrl(opts: {
  surveyId: string;
  slug?: string | null;
  period?: string | null;
  orgId?: string | null;
}): string {
  const origin = getPublicAppOrigin();
  const id = surveyPathId(opts.surveyId, opts.slug);
  const params = new URLSearchParams();
  if (opts.period?.trim()) params.set("period", opts.period.trim());
  if (opts.orgId?.trim()) params.set("org", opts.orgId.trim());
  const qs = params.toString();
  return `${origin}/survey/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`;
}
