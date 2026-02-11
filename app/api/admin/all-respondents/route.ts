/**
 * File: app/api/admin/all-respondents/route.ts
 * Description: Administrative API route for fetching global respondent data.
 * Retrieves all individuals who have participated in surveys across all organizations, bypassing RLS.
 * Functions:
 * - GET(): Validates admin authentication and returns a detailed list of all survey respondents.
 * Connections:
 * - Used by the Respondents page in the Admin section (/admin/respondents).
 * - Utilizes supabaseAdmin (Service Role) to aggregate data from multiple tenant partitions.
 */
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const adminId = cookieStore.get("admin_id")?.value;

        if (!adminId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const orgId = searchParams.get('orgId');

        // Create service role client to bypass RLS
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        let query = supabaseAdmin
            .from("responses")
            .select("user_id, org_id");

        if (orgId && orgId !== 'all') {
            query = query.eq("org_id", orgId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Supabase error fetching all respondents:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching all respondents:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
