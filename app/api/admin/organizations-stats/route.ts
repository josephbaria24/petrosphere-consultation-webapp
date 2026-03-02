/**
 * File: app/api/admin/organizations-stats/route.ts
 * Description: Administrative API route for global organization statistics.
 * Aggregates membership, respondent, survey counts and subscription plans for all organizations.
 * Functions:
 * - GET(): Validates admin session and returns aggregated stats for all organizations.
 * Connections:
 * - Called by the Manage Organizations administrative page.
 * - Uses supabaseAdmin (Service Role) to gain platform-wide visibility.
 */
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const adminId = cookieStore.get("admin_id")?.value;

        if (!adminId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Create service role client to bypass RLS
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch organizations
        const { data: orgs, error: orgsError } = await supabaseAdmin
            .from("organizations")
            .select("id, name, created_at")
            .order("name");

        if (orgsError) throw orgsError;

        // Fetch subscriptions to get plans
        const { data: subs, error: subsError } = await supabaseAdmin
            .from("subscriptions")
            .select("org_id, plan, status");

        if (subsError) throw subsError;

        // Fetch memberships
        const { data: mems, error: memsError } = await supabaseAdmin
            .from("memberships")
            .select("org_id, role, created_at, user_id");

        if (memsError) throw memsError;

        // Fetch profiles to get emails
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from("profiles")
            .select("user_id, email");

        if (profilesError) throw profilesError;

        // Fetch survey counts
        const { data: surveys, error: surveysError } = await supabaseAdmin
            .from("surveys")
            .select("org_id");

        if (surveysError) throw surveysError;

        // Fetch respondent counts from responses table (since users table lacks org_id)
        const { data: respondents, error: respondentsError } = await supabaseAdmin
            .from("responses")
            .select("user_id, org_id");

        if (respondentsError) throw respondentsError;

        // Aggregate data
        const stats = orgs.map(org => {
            const sub = subs.find(s => s.org_id === org.id);
            const orgMembers = mems.filter(m => m.org_id === org.id);

            // Find the primary email (prefer admin/demo role, joined earliest)
            const primaryMember = [...orgMembers]
                .sort((a, b) => {
                    const rolePriority: Record<string, number> = { admin: 0, demo: 1, member: 2 };
                    if (rolePriority[a.role] !== rolePriority[b.role]) {
                        return (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99);
                    }
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                })[0];

            let email = "N/A";
            if (primaryMember) {
                const profile = profiles.find(p => p.user_id === primaryMember.user_id);
                email = profile?.email || "N/A";
            }
            const surveysCount = surveys.filter(s => s.org_id === org.id).length;

            // Count unique respondents for this org
            const uniqueRespondents = new Set(
                respondents
                    .filter(r => r.org_id === org.id)
                    .map(r => r.user_id)
            ).size;

            return {
                ...org,
                email,
                plan: sub?.plan || "none",
                sub_status: sub?.status || "inactive",
                memberships_count: orgMembers.length,
                surveys_count: surveysCount,
                respondents_count: uniqueRespondents
            };
        });

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error("Error fetching organizations stats:", error);
        return NextResponse.json({
            error: error.message || "Internal server error",
            details: error.details || error.hint || null
        }, { status: 500 });
    }
}
