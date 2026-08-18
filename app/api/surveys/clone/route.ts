import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import {
  createServiceRoleClient,
  getVerifiedAdminFromCookie,
} from "../../../../lib/server/admin-auth";
import {
  cloneSurvey,
  cloneTitle,
  DEFAULT_SURVEY_ID,
} from "../../../../lib/server/clone-survey";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const admin = await getVerifiedAdminFromCookie(request);
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!admin && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const sourceSurveyId =
      typeof body.surveyId === "string" ? body.surveyId.trim() : "";
    const title = typeof body.title === "string" ? body.title : "";
    const destOrgIdRaw =
      typeof body.destOrgId === "string" ? body.destOrgId.trim() : "";

    if (!sourceSurveyId) {
      return NextResponse.json({ error: "surveyId is required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: source, error: sourceErr } = await supabase
      .from("surveys")
      .select("id, title, org_id")
      .eq("id", sourceSurveyId)
      .maybeSingle();

    if (sourceErr) {
      return NextResponse.json({ error: sourceErr.message }, { status: 500 });
    }
    if (!source) {
      return NextResponse.json({ error: "Source survey not found" }, { status: 404 });
    }

    let destOrgId = destOrgIdRaw || source.org_id || "";
    let createdBy: string | null = null;

    if (admin) {
      if (!destOrgId) {
        return NextResponse.json(
          { error: "Choose an organization for the cloned survey" },
          { status: 400 }
        );
      }
    } else if (user) {
      const { data: membership, error: memErr } = await supabase
        .from("memberships")
        .select("org_id, role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (memErr) {
        return NextResponse.json({ error: memErr.message }, { status: 500 });
      }
      if (!membership?.org_id) {
        return NextResponse.json(
          { error: "No organization found for this account" },
          { status: 403 }
        );
      }
      destOrgId = membership.org_id;
      createdBy = user.id;
      const sameOrg = source.org_id === destOrgId;
      const isDefault = source.id === DEFAULT_SURVEY_ID;
      if (!sameOrg && !isDefault) {
        return NextResponse.json(
          { error: "You can only clone surveys in your organization" },
          { status: 403 }
        );
      }
    }

    const cloned = await cloneSurvey({
      supabase,
      sourceSurveyId,
      destOrgId,
      title: title || cloneTitle(source.title || "Survey"),
      createdBy,
    });

    return NextResponse.json({
      ok: true,
      ...cloned,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to clone survey";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
