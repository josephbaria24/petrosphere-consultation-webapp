/**
 * File: app/api/admin/organizations/[id]/route.ts
 * Description: Administrative API route for deleting organizations.
 * Performs a cascading delete of all org-related data (surveys, responses, plans)
 * while ensuring system-wide resources like "Safety Vitals" are preserved.
 */
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const DEFAULT_SURVEY_ID = "00000000-0000-0000-0000-000000000000";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id: orgId } = await params;
        const cookieStore = await cookies();
        const adminId = cookieStore.get("admin_id")?.value;

        if (!adminId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch organization
        const { data: organization, error: orgError } = await supabaseAdmin
            .from("organizations")
            .select("*")
            .eq("id", orgId)
            .single();

        if (orgError) throw orgError;

        // Fetch subscription
        const { data: subscription } = await supabaseAdmin
            .from("subscriptions")
            .select("*")
            .eq("org_id", orgId)
            .single();

        // Fetch overrides
        const { data: overrides } = await supabaseAdmin
            .from("org_limit_overrides")
            .select("*")
            .eq("org_id", orgId)
            .single();

        return NextResponse.json({
            organization,
            subscription,
            overrides: overrides || {}
        });
    } catch (error: any) {
        console.error("Error fetching organization details:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id: orgId } = await params;
        const cookieStore = await cookies();
        const adminId = cookieStore.get("admin_id")?.value;

        if (!adminId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, plan, overrides } = body;

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Update Organization Name
        if (name) {
            await supabaseAdmin.from("organizations").update({ name }).eq("id", orgId);
        }

        // 2. Update Subscription Plan
        if (plan) {
            await supabaseAdmin.from("subscriptions").upsert({
                org_id: orgId,
                plan,
                updated_at: new Date().toISOString()
            }, { onConflict: 'org_id' });
        }

        // 3. Update/Upsert Overrides
        if (overrides) {
            await supabaseAdmin.from("org_limit_overrides").upsert({
                org_id: orgId,
                ...overrides,
                updated_at: new Date().toISOString()
            }, { onConflict: 'org_id' });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error updating organization:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id: orgId } = await params;
        const cookieStore = await cookies();
        const adminId = cookieStore.get("admin_id")?.value;

        if (!adminId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Create service role client to bypass RLS for cleanup
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        console.log(`[Admin] Initiating cascading delete for Organization: ${orgId}`);

        // 1. Delete Actions
        await supabaseAdmin.from("actions").delete().eq("org_id", orgId);

        // 2. Delete Responses
        await supabaseAdmin.from("responses").delete().eq("org_id", orgId);

        // 3. Handle Surveys (Exclude Safety Vitals)
        // First find all survey IDs for this org that aren't the default one
        const { data: orgSurveys } = await supabaseAdmin
            .from("surveys")
            .select("id")
            .eq("org_id", orgId)
            .neq("id", DEFAULT_SURVEY_ID);

        const surveyIds = orgSurveys?.map(s => s.id) || [];

        if (surveyIds.length > 0) {
            // Delete questions for these surveys
            await supabaseAdmin.from("survey_questions").delete().in("survey_id", surveyIds);

            // Delete AI Insights for these surveys
            await supabaseAdmin.from("survey_ai_insights").delete().in("survey_id", surveyIds);

            // Delete the surveys themselves
            await supabaseAdmin.from("surveys").delete().in("id", surveyIds);
        }

        // 4. Delete Memberships/Subscriptions/Overrides
        await supabaseAdmin.from("memberships").delete().eq("org_id", orgId);
        await supabaseAdmin.from("subscriptions").delete().eq("org_id", orgId);
        await supabaseAdmin.from("org_limit_overrides").delete().eq("org_id", orgId);

        // 5. Delete the Organization record
        const { error: deleteOrgError } = await supabaseAdmin
            .from("organizations")
            .delete()
            .eq("id", orgId);

        if (deleteOrgError) {
            console.error("Error deleting organization record:", deleteOrgError);
            return NextResponse.json({ error: deleteOrgError.message }, { status: 500 });
        }

        console.log(`[Admin] Successfully deleted Organization: ${orgId}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in organization deletion:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
