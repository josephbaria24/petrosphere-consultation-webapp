import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import {
  createServiceRoleClient,
  getVerifiedAdminFromCookie,
} from "../../../../lib/server/admin-auth";
import { DEFAULT_SURVEY_ID } from "../../../../lib/server/clone-survey";
import { deleteSurveyAndRelated } from "../../../../lib/server/delete-survey";

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
    const surveyId =
      typeof body.surveyId === "string" ? body.surveyId.trim() : "";
    if (!surveyId) {
      return NextResponse.json({ error: "surveyId is required" }, { status: 400 });
    }
    if (surveyId === DEFAULT_SURVEY_ID) {
      return NextResponse.json(
        { error: "The default Safety Vitals survey cannot be deleted" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data: survey, error: surveyErr } = await supabase
      .from("surveys")
      .select("id, org_id")
      .eq("id", surveyId)
      .maybeSingle();

    if (surveyErr) {
      return NextResponse.json({ error: surveyErr.message }, { status: 500 });
    }
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (!admin && user) {
      const { data: membership, error: memErr } = await supabase
        .from("memberships")
        .select("org_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (memErr) {
        return NextResponse.json({ error: memErr.message }, { status: 500 });
      }
      if (!membership?.org_id || membership.org_id !== survey.org_id) {
        return NextResponse.json(
          { error: "You can only delete surveys in your organization" },
          { status: 403 }
        );
      }
    }

    const result = await deleteSurveyAndRelated(supabase, surveyId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete survey";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
