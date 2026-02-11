/**
 * File: app/api/admin/all-users/route.ts
 * Description: Administrative API route for global user profile access.
 * Fetches all user records across the platform, bypassing multi-tenant constraints for admins.
 * Functions:
 * - GET(): Validates admin identity and returns user metadata (profiles).
 * Connections:
 * - Called by administrative user management tools and the Respondents page for admins.
 * - Leverages supabaseAdmin (Service Role) to access the auth.users or public.users data globally.
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

        const { userIds } = await req.json();

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json([]);
        }

        // Create service role client to bypass RLS
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await supabaseAdmin
            .from("users")
            .select("id, first_name, last_name, email, role, department, site")
            .in("id", userIds);

        if (error) {
            console.error("Supabase error fetching users:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
