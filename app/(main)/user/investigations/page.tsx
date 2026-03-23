import { requireAuth } from "../../../../lib/auth";
import InvestigationsDashboard from "../../../../components/dashboard/investigations-dashboard";

export default async function UserInvestigationsPage() {
  await requireAuth();
  return <InvestigationsDashboard isAdmin={false} />;
}
