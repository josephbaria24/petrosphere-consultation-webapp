import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getVerifiedAdminFromCookie } from "../../../lib/server/admin-auth"
import { checkIpRateLimit } from "../../../lib/server/rate-limit"

export async function GET(request: Request) {
  const rate = checkIpRateLimit(request, "ping-supabase", 6, 60_000)
  if (!rate.ok) {
    return NextResponse.json(
      { success: false, error: "Too many ping requests" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    )
  }

  const admin = await getVerifiedAdminFromCookie()
  const internalToken = process.env.INTERNAL_PING_TOKEN
  const providedToken = request.headers.get("x-internal-token")
  const hasValidInternalToken = !!internalToken && providedToken === internalToken

  if (!admin && !hasValidInternalToken) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error("[PING] Missing Supabase credentials.")
    return NextResponse.json(
      { success: false, error: "Missing Supabase credentials" },
      { status: 500 }
    )
  }

  const supabase = createClient(url, key)
  const now = new Date().toISOString()

  try {
    // Lightweight query to keep Supabase awake
    const { data, error } = await supabase
      .from("admin_users")
      .select("id")
      .limit(1)

    if (error) throw error

    console.log(`[PING] Safety Vitals Supabase ping successful at ${now}`)
    return NextResponse.json({
      success: true,
      pingedAt: now,
      rows: data?.length ?? 0,
    })
  } catch (err: any) {
    console.error(`[PING] Failed at ${now}:`, err.message)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
