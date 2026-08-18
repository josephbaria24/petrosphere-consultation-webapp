import { getClientCookie } from "./cookies-client";

export async function requestDeleteSurvey(surveyId: string) {
  const adminId = getClientCookie("admin_id");
  const resp = await fetch("/api/surveys/delete", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(adminId ? { "x-admin-id": adminId } : {}),
    },
    body: JSON.stringify({ surveyId }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Failed to delete survey"
    );
  }
  return data as { ok: boolean; deletedQuestions: number };
}
