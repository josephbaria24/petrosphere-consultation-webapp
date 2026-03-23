import { createClient } from "../../../lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const body = await request.json();
        const { organizationName, fullName } = body;

        console.log(`[Onboarding] Proceeding for user ${session.user.id}`, { organizationName, fullName });

        if (!organizationName) {
            return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
        }

        // 1. Get user's membership to find their organization
        const { data: membership, error: memError } = await supabaseAdmin
            .from("memberships")
            .select("org_id")
            .eq("user_id", session.user.id)
            .single();

        if (memError || !membership) {
            console.error("[Onboarding] Membership error:", memError);
            return NextResponse.json({ error: "No organization found for user" }, { status: 404 });
        }

        // 2. Update Organization Name
        const { error: orgError } = await supabaseAdmin
            .from("organizations")
            .update({ name: organizationName })
            .eq("id", membership.org_id);

        if (orgError) {
            console.error("[Onboarding] Org update error:", orgError);
            return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
        }

        // 3. Update Profile (Full Name and mark as Onboarded)
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({
                full_name: fullName,
                is_onboarded: true,
                onboarding_step: 1
            })
            .eq("user_id", session.user.id);

        if (profileError) {
            console.error("[Onboarding] Profile update error:", profileError);
            return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
        }

        console.log(`[Onboarding] Success for user ${session.user.id}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Onboarding] Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
