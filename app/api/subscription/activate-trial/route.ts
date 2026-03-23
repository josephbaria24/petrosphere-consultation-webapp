import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use admin client to bypass RLS for subscription update
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Get user's organization
    const { data: membership, error: memberError } = await supabaseAdmin
      .from("memberships")
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Only admins or the owner should start a trial (for now, let's keep it simple)
    if (membership.role !== "admin" && membership.role !== "member") {
        // ... allow members too for now as per "frictionless" goal unless it's a multi-user org restriction
    }

    // 2. Check current subscription
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan, status")
      .eq("org_id", membership.org_id)
      .maybeSingle();

    // 3. Activate trial (Upsert)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const { error: upsertError } = await supabaseAdmin
      .from("subscriptions")
      .upsert({
        org_id: membership.org_id,
        status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
        plan: subscription?.plan || "basic", // Keep it basic or use existing
      }, { onConflict: 'org_id' });

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({ 
      success: true, 
      trial_ends_at: trialEndsAt.toISOString() 
    });

  } catch (error: any) {
    console.error("Trial activation error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
