// app/(main)/user/view-survey/page.tsx (server component)
import { requireAuth } from "../../../../lib/auth";
import ViewSurveysClient from "./ViewSurveysClient";

export default async function ViewSurveysPage() {
  // This will redirect to /admin-login if not authenticated
  await requireAuth();

  // ✅ Authenticated → render the client component
  return <ViewSurveysClient />;
}
