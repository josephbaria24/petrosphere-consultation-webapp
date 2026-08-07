import { requireAuth } from "../../../../lib/auth";
import InspectionReportsPageClient from "../../../../components/tasks/InspectionReportsPageClient";

export default async function AdminInspectionReportsPage() {
  await requireAuth();
  return <InspectionReportsPageClient isAdmin={true} />;
}
