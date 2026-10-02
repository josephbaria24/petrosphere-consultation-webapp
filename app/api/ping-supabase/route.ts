import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkIpRateLimit } from "../../../lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(request: Request) {
  const rate = checkIpRateLimit(request, "ping-supabase", 12, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      { success: false, error: "Too many ping requests" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("[PING] Missing Supabase credentials.");
    return NextResponse.json(
      { success: false, error: "Missing Supabase credentials" },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("id")
      .limit(1);

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        pingedAt: now,
        rows: data?.length ?? 0,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ping failed";
    console.error(`[PING] Failed at ${now}:`, message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
