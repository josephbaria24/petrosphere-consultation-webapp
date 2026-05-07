type RateBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

const GLOBAL_KEY = "__safety_vitals_rate_limit_store__";

function getStore(): Map<string, RateBucket> {
  const g = globalThis as unknown as Record<string, Map<string, RateBucket> | undefined>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, RateBucket>();
  }
  return g[GLOBAL_KEY]!;
}

export function getRequestIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const xrip = request.headers.get("x-real-ip");
  if (xrip) return xrip.trim();

  return "unknown";
}

export function checkIpRateLimit(
  request: Request,
  keyPrefix: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const ip = getRequestIp(request);
  const now = Date.now();
  const key = `${keyPrefix}:${ip}`;
  const store = getStore();
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      ok: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSec: Math.ceil(windowMs / 1000),
    };
  }

  bucket.count += 1;
  store.set(key, bucket);

  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return {
    ok: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}
