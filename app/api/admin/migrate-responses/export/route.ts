import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getVerifiedAdminFromCookie } from "../../../../../lib/server/admin-auth";
import {
  sheetsToCsv,
  sheetsToExcelBuffer,
  RESPONSE_EXPORT_COLUMNS,
  type ExportSheet,
} from "../../../../../lib/migrate-response-export";
import {
  loadOrgName,
  loadUsersById,
  prepareCopyPlan,
  sourceBackupSheets,
  type MigrationItem,
  type ResponseRow,
} from "../../../../../lib/server/migrate-responses";

export const runtime = "nodejs";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function fileResponse(filename: string, body: Uint8Array | string, format: string) {
  const isXlsx = format === "xlsx";
  return new NextResponse(body, {
    headers: {
      "Content-Type": isXlsx
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function slug(value: string) {
  return (value || "survey")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function GET(req: Request) {
  try {
    const admin = await getVerifiedAdminFromCookie();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
    const kind = url.searchParams.get("kind") || "preview";
    const supabase = adminClient();

    let sheets: ExportSheet[] = [];
    let filenameBase = "survey-response-backup";

    if (kind === "migration") {
      const migrationId = url.searchParams.get("migrationId") || "";
      if (!migrationId) {
        return NextResponse.json(
          { error: "migrationId is required" },
          { status: 400 }
        );
      }

      const { data: migration, error: migErr } = await supabase
        .from("response_migrations")
        .select("*")
        .eq("id", migrationId)
        .maybeSingle();
      if (migErr) {
        return NextResponse.json({ error: migErr.message }, { status: 500 });
      }
      if (!migration) {
        return NextResponse.json({ error: "Migration not found" }, { status: 404 });
      }

      const items: MigrationItem[] = [];
      const page = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("response_migration_items")
          .select(
            "id, migration_id, action, source_response_id, dest_response_id, user_id, source_question_id, dest_question_id, answer, source_snapshot"
          )
          .eq("migration_id", migrationId)
          .range(from, from + page - 1);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        const batch = (data || []) as MigrationItem[];
        items.push(...batch);
        if (batch.length < page) break;
        from += page;
      }

      const userIds = Array.from(
        new Set(items.map((i) => i.user_id).filter((id): id is string => Boolean(id)))
      );
      const users = await loadUsersById(supabase, userIds);
      filenameBase = `migration-${slug(migration.dest_survey_title || "dest")}-${migration.status}`;

      const toRow = (item: MigrationItem) => {
        const snap = (item.source_snapshot || {}) as ResponseRow;
        const user = users[item.user_id || snap.user_id || ""];
        const name = [user?.first_name, user?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        return {
          respondent_name: name || user?.email || "",
          email: user?.email || "",
          role: snap.role || user?.role || "",
          department: snap.department || user?.department || "",
          site: snap.site || user?.site || "",
          user_id: item.user_id || snap.user_id || "",
          question_order: "",
          dimension: snap.dimension || "",
          dimension_code: "",
          question: snap.question || "",
          answer: item.answer || snap.answer || "",
          created_at: snap.created_at || "",
          source_response_id: item.source_response_id || snap.id || "",
          dest_response_id: item.dest_response_id || "",
          status: item.action,
        };
      };

      sheets = [
        {
          name: "Summary",
          columns: [
            { header: "Field", key: "field", width: 28 },
            { header: "Value", key: "value", width: 64 },
          ],
          rows: [
            { field: "Migration ID", value: migration.id },
            { field: "Status", value: migration.status },
            { field: "Created at", value: migration.created_at },
            { field: "Created by", value: migration.created_by_email || "" },
            { field: "Source org", value: migration.source_org_name || "" },
            { field: "Source survey", value: migration.source_survey_title || "" },
            { field: "Destination org", value: migration.dest_org_name || "" },
            { field: "Destination survey", value: migration.dest_survey_title || "" },
            { field: "Copied", value: migration.copied_count },
            { field: "Skipped conflicts", value: migration.skipped_conflict },
            { field: "Skipped unmatched", value: migration.skipped_unmatched },
            { field: "Failed", value: migration.failed_count },
            { field: "Restored at", value: migration.restored_at || "" },
            { field: "Restored by", value: migration.restored_by_email || "" },
            { field: "Notes", value: migration.notes || "" },
          ],
        },
        {
          name: "Copied",
          columns: RESPONSE_EXPORT_COLUMNS,
          rows: items.filter((i) => i.action === "copied").map(toRow),
        },
        {
          name: "Skipped conflicts",
          columns: RESPONSE_EXPORT_COLUMNS,
          rows: items.filter((i) => i.action === "skipped_conflict").map(toRow),
        },
        {
          name: "Unmatched (not copied)",
          columns: RESPONSE_EXPORT_COLUMNS,
          rows: items.filter((i) => i.action === "skipped_unmatched").map(toRow),
        },
        {
          name: "Failed",
          columns: RESPONSE_EXPORT_COLUMNS,
          rows: items.filter((i) => i.action === "failed").map(toRow),
        },
      ];
    } else {
      const sourceOrgId = url.searchParams.get("sourceOrgId") || "";
      const destOrgId = url.searchParams.get("destOrgId") || "";
      const sourceSurveyId = url.searchParams.get("sourceSurveyId") || "";
      const destSurveyId = url.searchParams.get("destSurveyId") || "";
      if (!sourceOrgId || !destOrgId || !sourceSurveyId || !destSurveyId) {
        return NextResponse.json(
          { error: "sourceOrgId, destOrgId, sourceSurveyId, destSurveyId are required" },
          { status: 400 }
        );
      }

      const prepared = await prepareCopyPlan(supabase, {
        sourceOrgId,
        destOrgId,
        sourceSurveyId,
        destSurveyId,
      });
      const users = await loadUsersById(
        supabase,
        Array.from(new Set(prepared.sourceResponses.map((r) => r.user_id)))
      );
      const [sourceOrgName, destOrgName] = await Promise.all([
        loadOrgName(supabase, sourceOrgId),
        loadOrgName(supabase, destOrgId),
      ]);
      filenameBase = `backup-${slug(prepared.sourceSurvey.title)}-to-${slug(prepared.destSurvey.title)}`;
      sheets = sourceBackupSheets({
        sourceOrgName: sourceOrgName || sourceOrgId,
        destOrgName: destOrgName || destOrgId,
        sourceSurveyTitle: prepared.sourceSurvey.title,
        destSurveyTitle: prepared.destSurvey.title,
        matches: prepared.matches,
        sourceResponses: prepared.sourceResponses,
        sourceQuestions: prepared.sourceQuestions,
        destQuestions: prepared.destQuestions,
        users,
        toCopy: prepared.planned.toCopy,
        skippedConflict: prepared.planned.skippedConflict,
        skippedDuplicate: prepared.planned.skippedDuplicate,
        skippedUnmatched: prepared.planned.skippedUnmatched,
      });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      return fileResponse(
        `${filenameBase}-${stamp}.csv`,
        sheetsToCsv(sheets),
        "csv"
      );
    }
    const buffer = await sheetsToExcelBuffer(sheets, filenameBase);
    return fileResponse(
      `${filenameBase}-${stamp}.xlsx`,
      new Uint8Array(buffer),
      "xlsx"
    );
  } catch (error: unknown) {
    console.error("migrate export error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
