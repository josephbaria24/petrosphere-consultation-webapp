/**
 * Public survey URL helpers — always rebuild from current origin / site URL
 * so links never stick to localhost after deploy.
 */

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

/** Keep http for local dev; force https everywhere else. */
export function toHttpsOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "https://safetyvitals.petros-global.com";
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!isLocalHostname(url.hostname)) {
      url.protocol = "https:";
    }
    return url.origin;
  } catch {
    return trimmed.replace(/^http:\/\//i, "https://");
  }
}

export function getPublicAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return toHttpsOrigin(window.location.origin);
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return toHttpsOrigin(fromEnv);
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
