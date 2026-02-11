/**
 * File: app/api/admin/all-organizations/route.ts
 * Description: Administrative API route for global organization access.
 * Fetches all organization records for platform oversight, bypassing multi-tenant RLS.
 * Functions:
 * - GET(): Validates admin session and returns the list of all organizations.
 * Connections:
 * - Called by administrative management pages and the Respondents page for admins.
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

        const { data, error } = await supabaseAdmin
            .from("organizations")
            .select("id, name")
            .order("name");

        if (error) {
            console.error("Supabase error fetching all organizations:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching all organizations:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
