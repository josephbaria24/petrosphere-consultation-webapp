import { requireAuth } from "../../../../lib/auth";
import InspectionReportsPageClient from "../../../../components/tasks/InspectionReportsPageClient";

export default async function UserInspectionReportsPage() {
  await requireAuth();
  return <InspectionReportsPageClient isAdmin={false} />;
}
