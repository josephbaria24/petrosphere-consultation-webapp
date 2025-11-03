import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
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
