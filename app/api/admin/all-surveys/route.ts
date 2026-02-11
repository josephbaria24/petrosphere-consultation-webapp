/**
 * File: app/api/admin/all-surveys/route.ts
 * Description: Administrative API route for global survey access.
 * Bypasses RLS to fetch all surveys for authenticated Platform Admins.
 * Functions:
 * - GET(): Verifies admin_id cookie and returns all survey records from the database.
 * Connections:
 * - Called by Dashboard when isPlatformAdmin is true.
 * - Uses supabaseAdmin (Service Role) to bypass multi-tenant restrictions.
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
            .from("surveys")
            .select(`
                id, 
                title, 
                target_company, 
                org_id,
                organizations (
                    name
                )
            `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase error fetching all surveys:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching all surveys:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
