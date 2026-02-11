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
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const adminId = cookieStore.get("admin_id")?.value;

        if (!adminId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { questionIds, orgId } = await req.json();

        if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
            return NextResponse.json({ error: "Question IDs are required" }, { status: 400 });
        }

        // Create service role client to bypass RLS
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        let query = supabaseAdmin
            .from("responses")
            .select("user_id, question_id, answer, org_id, created_at")
            .in("question_id", questionIds);

        if (orgId && orgId !== 'all') {
            query = query.eq("org_id", orgId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Supabase error fetching all responses:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching all responses:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
