// app/(main)/admin/create-survey/page.tsx (server component)
import { requireAuth } from "../../../../lib/auth";
import CreateSurveyPageClient from "./CreateSurveyPageClient";

export default async function CreateSurveyPage() {
  // This will redirect to /admin-login if not authenticated
  await requireAuth();

  // ✅ If we're here, the user is authenticated (admin or demo)
  return <CreateSurveyPageClient />;
}
