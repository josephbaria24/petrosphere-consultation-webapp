import { redirect } from "next/navigation";
import { requireAuth } from "../../../../lib/auth";

export default async function AdminInvestigationsPage() {
  await requireAuth();
  redirect("/admin/inspection-reports");
}
