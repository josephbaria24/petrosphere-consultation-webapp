/**
 * Admin API for consultant question banks (per-org instrument repos).
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAdminFromCookie } from "../../../../lib/server/admin-auth";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getVerifiedAdminFromCookie(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = request.nextUrl.searchParams.get("orgId");
    const supabase = adminClient();
    let query = supabase
      .from("consultant_question_banks")
      .select(
        "id, org_id, name, description, company_label, questions, created_at, updated_at"
      )
      .order("updated_at", { ascending: false });

    if (orgId) query = query.eq("org_id", orgId);

    const { data, error } = await query;
    if (error) {
      console.error("consultant-banks GET:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Attach org names when possible
    const rows = data || [];
    const orgIds = Array.from(new Set(rows.map((r) => r.org_id).filter(Boolean)));
    let nameById: Record<string, string> = {};
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      (orgs || []).forEach((o) => {
        nameById[o.id] = o.name;
      });
    }

    return NextResponse.json(
      rows.map((r) => ({
        ...r,
        organizations: nameById[r.org_id]
          ? { name: nameById[r.org_id] }
          : null,
      }))
    );
  } catch (error) {
    console.error("consultant-banks GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getVerifiedAdminFromCookie(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const orgId = body.org_id as string | undefined;
    const name = (body.name as string | undefined)?.trim();
    const questions = body.questions;

    if (!orgId || !name) {
      return NextResponse.json(
        { error: "org_id and name are required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "questions array is required" },
        { status: 400 }
      );
    }

    const supabase = adminClient();
    const { data, error } = await supabase
      .from("consultant_question_banks")
      .insert([
        {
          org_id: orgId,
          name,
          description: body.description?.trim() || null,
          company_label: body.company_label?.trim() || null,
          questions,
          created_by: admin.id || null,
        },
      ])
      .select(
        "id, org_id, name, description, company_label, questions, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error("consultant-banks POST:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("consultant-banks POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getVerifiedAdminFromCookie(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const id = body.id as string | undefined;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.name === "string") patch.name = body.name.trim();
    if (body.description !== undefined)
      patch.description = body.description?.trim() || null;
    if (body.company_label !== undefined)
      patch.company_label = body.company_label?.trim() || null;
    if (Array.isArray(body.questions)) patch.questions = body.questions;

    const supabase = adminClient();
    const { data, error } = await supabase
      .from("consultant_question_banks")
      .update(patch)
      .eq("id", id)
      .select(
        "id, org_id, name, description, company_label, questions, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error("consultant-banks PATCH:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("consultant-banks PATCH:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await getVerifiedAdminFromCookie(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = adminClient();
    const { error } = await supabase
      .from("consultant_question_banks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("consultant-banks DELETE:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("consultant-banks DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
