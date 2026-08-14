/**
 * File: app/api/admin/all-responses/route.ts
 * Description: Administrative API route for global survey response access.
 * Bypasses RLS to fetch all response records for authenticated Platform Admins.
 * Functions:
 * - POST(): Verifies admin_id cookie and returns all response data for specific question IDs.
 * Connections:
 * - Called by Dashboard analytics logic when isPlatformAdmin is true.
 * - Uses supabaseAdmin (Service Role) for cross-organization data retrieval.
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getVerifiedAdminFromCookie } from "../../../../lib/server/admin-auth";

export async function POST(req: Request) {
    try {
        const admin = await getVerifiedAdminFromCookie();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { questionIds, orgId } = await req.json();

        if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
            return NextResponse.json({ error: "Question IDs are required" }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        let query = supabaseAdmin
            .from("responses")
            .select("user_id, question_id, answer, org_id, created_at, role, department")
            .in("question_id", questionIds);

        if (orgId && orgId !== "all") {
            query = query.eq("org_id", orgId);
        }

        const { data, error } = await query;

        if (error) {
            // Older DBs may lack responses.department — retry without it
            if (String(error.message || "").toLowerCase().includes("department")) {
                let fallback = supabaseAdmin
                    .from("responses")
                    .select("user_id, question_id, answer, org_id, created_at, role")
                    .in("question_id", questionIds);
                if (orgId && orgId !== "all") fallback = fallback.eq("org_id", orgId);
                const retry = await fallback;
                if (retry.error) {
                    console.error("Supabase error fetching all responses:", retry.error);
                    return NextResponse.json({ error: retry.error.message }, { status: 500 });
                }
                return NextResponse.json(retry.data);
            }
            console.error("Supabase error fetching all responses:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Enrich with user department/role when response metadata is missing
        const userIds = Array.from(
            new Set((data || []).map((r) => r.user_id).filter(Boolean))
        );
        if (userIds.length > 0) {
            const { data: users } = await supabaseAdmin
                .from("users")
                .select("id, role, department")
                .in("id", userIds);
            const userMap = Object.fromEntries(
                (users || []).map((u) => [u.id, u])
            );
            const enriched = (data || []).map((r) => ({
                ...r,
                role: r.role || userMap[r.user_id]?.role || null,
                department: r.department || userMap[r.user_id]?.department || null,
            }));
            return NextResponse.json(enriched);
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching all responses:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
